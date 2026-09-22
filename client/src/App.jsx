import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import PaymentPanel from './components/PaymentPanel';
import UsagePanel from './components/UsagePanel';
import { AuthApi } from './api/nwsdbApi';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nwsdb_user') || 'null'); } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('nwsdb_token')));

  useEffect(() => {
    if (!localStorage.getItem('nwsdb_token')) { setChecking(false); return; }
    AuthApi.me().then((current) => {
      const next = { userId: current.userId, fullName: current.fullName, email: current.email, role: current.role, accountNumber: current.accountNumber };
      localStorage.setItem('nwsdb_user', JSON.stringify(next));
      setUser(next);
    }).catch(() => {
      localStorage.removeItem('nwsdb_token'); localStorage.removeItem('nwsdb_user'); setUser(null);
    }).finally(() => setChecking(false));
  }, []);

  const authenticated = (response) => {
    const next = { userId: response.userId, fullName: response.fullName, email: response.email, role: response.role, accountNumber: response.accountNumber };
    setUser(next);
  };
  const logout = () => {
    localStorage.removeItem('nwsdb_token'); localStorage.removeItem('nwsdb_user'); setUser(null);
  };

  if (checking) return <main className="auth-page"><section className="auth-card auth-loading"><p>Checking your secure session…</p></section></main>;
  if (!user) return <Login onAuthenticated={authenticated} />;

  const accountNumber = user.accountNumber || 'NWSDB-0001';

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-label="Water"><path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" /><path className="brand-wave" d="M8.7 15.2c1.1 1.1 2.3 1.6 3.6 1.6 1.3 0 2.5-.5 3.6-1.6" /></svg>
          </div>
          <div><strong>NWSDB</strong><span>Customer Portal</span></div>
        </div>
        <div className="user-menu">
          <div className="user-meta"><strong>{user.fullName}</strong><span>{user.email}</span></div>
          <button type="button" className="logout-button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-content">
          <p className="eyebrow">National Water Supply & Drainage Board</p>
          <h1 id="page-title">Your water account</h1>
          <p>View your latest usage and make a water bill payment securely.</p>
        </div>
      </section>

      <nav className="section-nav" aria-label="Customer services">
        <a href="#usage">Usage</a><a href="#payment">Payments</a><a href="#history">Payment history</a>
      </nav>

      <section className="card account-card" aria-labelledby="account-heading">
        <div className="account-copy">
          <span className="card-kicker">Signed-in customer</span>
          <h2 id="account-heading">Account overview</h2>
          <p className="muted">Your authenticated NWSDB customer account.</p>
        </div>
        <label htmlFor="accountNumber">Account number<input id="accountNumber" value={accountNumber} readOnly /></label>
      </section>

      <div id="usage"><UsagePanel accountNumber={accountNumber} /></div>
      <div id="payment"><PaymentPanel accountNumber={accountNumber} /></div>

      <footer className="footer"><span>NWSDB Customer Services</span><span>Signed in as {user.role}</span></footer>
    </main>
  );
}
