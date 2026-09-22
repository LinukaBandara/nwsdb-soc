import React, { useState } from 'react';
import { AuthApi } from '../api/nwsdbApi';

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', accountNumber: 'NWSDB-0001' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = mode === 'login'
        ? await AuthApi.login(form.email.trim(), form.password)
        : await AuthApi.register(form.fullName.trim(), form.email.trim(), form.password, form.accountNumber.trim());
      localStorage.setItem('nwsdb_token', response.token);
      localStorage.setItem('nwsdb_user', JSON.stringify({
        userId: response.userId, fullName: response.fullName, email: response.email,
        role: response.role, accountNumber: response.accountNumber
      }));
      onAuthenticated(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" /></svg>
          </div>
          <div><strong>NWSDB</strong><span>Customer Portal</span></div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">Secure access</p>
          <h1 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>{mode === 'login' ? 'Sign in to view your water usage and manage payments.' : 'Register a customer account to access NWSDB services.'}</p>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>Full name<input value={form.fullName} onChange={update('fullName')} placeholder="Your full name" required /></label>
          )}
          <label>Email address<input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required /></label>
          <label>Password<input type="password" value={form.password} onChange={update('password')} placeholder="At least 6 characters" minLength="6" required /></label>
          {mode === 'register' && (
            <label>Account number<input value={form.accountNumber} onChange={update('accountNumber')} placeholder="NWSDB-0001" required /></label>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>

        <div className="auth-switch">
          <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
          <button type="button" className="link-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </div>
        <p className="auth-note">Your session is protected using JWT authentication.</p>
      </section>
    </main>
  );
}
