import React, { useState } from 'react';
import { AuthApi } from '../api/nwsdbApi';

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', accountNumber: 'NWSDB-0001' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const setDemoAccount = (role) => {
    setError('');
    if (role === 'admin') {
      setMode('login');
      setForm({ fullName: 'Administrator', email: 'admin@nwsdb.local', password: 'Admin@123', accountNumber: '' });
    } else if (role === 'staff') {
      setMode('login');
      setForm({ fullName: 'Service Staff', email: 'staff@nwsdb.local', password: 'Staff@123', accountNumber: '' });
    } else if (role === 'partner') {
      setMode('login');
      setForm({ fullName: 'Partner Agency', email: 'partner@nwsdb.local', password: 'Partner@123', accountNumber: '' });
    } else if (role === 'customer') {
      setMode('login');
      setForm({ fullName: 'Domestic Customer', email: 'customer@nwsdb.local', password: 'Customer@123', accountNumber: 'NWSDB-0001' });
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      if (mode === 'login') {
        response = await AuthApi.login(form.email.trim(), form.password);
      } else {
        response = await AuthApi.register(form.fullName.trim(), form.email.trim(), form.password, form.accountNumber.trim());
      }
      localStorage.setItem('nwsdb_token', response.token);
      localStorage.setItem('nwsdb_user', JSON.stringify({
        userId: response.userId,
        fullName: response.fullName,
        email: response.email,
        role: response.role,
        accountNumber: response.accountNumber
      }));
      onAuthenticated(response);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-national-crest">
          <span className="flag-bar" aria-hidden="true" />
          <span>Democratic Socialist Republic of Sri Lanka</span>
        </div>

        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-label="NWSDB Water Crest">
              <path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" />
              <path className="brand-wave" d="M8.7 15.2c1.1 1.1 2.3 1.6 3.6 1.6 1.3 0 2.5-.5 3.6-1.6" />
            </svg>
          </div>
          <div>
            <strong>National Water Supply & Drainage Board</strong>
            <span>Customer & Operations Gateway</span>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">Enterprise Access</p>
          <h1 id="auth-title">{mode === 'login' ? 'Sign in to your account' : 'Customer registration'}</h1>
          <p>
            {mode === 'login'
              ? 'Access water consumption intelligence, bill settlement, or staff operations.'
              : 'Register your water supply account to manage bills and track consumption.'}
          </p>
        </div>

        <div className="demo-accounts-panel">
          <div className="demo-accounts-title">
            <span>Quick Demo Credentials</span>
            <span className="muted">1-Click Fill</span>
          </div>
          <div className="demo-chips">
            <button type="button" className="demo-chip" onClick={() => setDemoAccount('admin')}>
              Admin <span>(Full Access)</span>
            </button>
            <button type="button" className="demo-chip" onClick={() => setDemoAccount('staff')}>
              Staff <span>(Operations)</span>
            </button>
            <button type="button" className="demo-chip" onClick={() => setDemoAccount('customer')}>
              Customer <span>(NWSDB-0001)</span>
            </button>
          </div>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Full name
              <input
                type="text"
                value={form.fullName}
                onChange={update('fullName')}
                placeholder="e.g. Priyantha Jayasuriya"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="e.g. admin@nwsdb.local or customer@example.com"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <div className="input-with-action">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                placeholder="Account password (min 6 characters)"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength="6"
                required
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </label>

          {mode === 'register' && (
            <label>
              NWSDB Account Number
              <input
                type="text"
                value={form.accountNumber}
                onChange={update('accountNumber')}
                placeholder="e.g. NWSDB-0001"
                required
              />
            </label>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? (
              <span>Authenticating…</span>
            ) : mode === 'login' ? (
              <span>Sign in to NWSDB</span>
            ) : (
              <span>Create Customer Account</span>
            )}
          </button>
        </form>

        <div className="auth-switch">
          <span>{mode === 'login' ? "New customer with a water connection?" : "Already registered?"}</span>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Register account' : 'Sign in'}
          </button>
        </div>

        <div className="auth-security-footer">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            256-bit TLS Encrypted
          </span>
          <span>JWT Role-Enforced</span>
        </div>
      </section>
    </main>
  );
}
