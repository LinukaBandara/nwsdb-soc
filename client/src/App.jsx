import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import PublicHome from './components/PublicHome';
import PaymentPanel from './components/PaymentPanel';
import UsagePanel from './components/UsagePanel';
import { AuthApi } from './api/nwsdbApi';
import OperationsDashboard from './components/OperationsDashboard';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nwsdb_user') || 'null');
    } catch {
      return null;
    }
  });
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('nwsdb_token')));
  const [refreshKey, setRefreshKey] = useState(0);
  const [authScreen, setAuthScreen] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('nwsdb_token')) {
      setChecking(false);
      return;
    }
    AuthApi.me()
      .then((current) => {
        const next = {
          userId: current.id,
          fullName: current.fullName,
          email: current.email,
          role: current.role,
          accountNumber: current.accountNumber
        };
        localStorage.setItem('nwsdb_user', JSON.stringify(next));
        setUser(next);
      })
      .catch(() => {
        localStorage.removeItem('nwsdb_token');
        localStorage.removeItem('nwsdb_user');
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const authenticated = (response) => {
    const next = {
      userId: response.userId,
      fullName: response.fullName,
      email: response.email,
      role: response.role,
      accountNumber: response.accountNumber
    };
    setUser(next);
  };

  const logout = () => {
    localStorage.removeItem('nwsdb_token');
    localStorage.removeItem('nwsdb_user');
    setUser(null);
  };

  const copyAccountNumber = (acc) => {
    navigator.clipboard?.writeText(acc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (checking) {
    return (
      <main className="auth-page">
        <section className="auth-card" style={{ textAlign: 'center', padding: '48px 30px' }}>
          <div className="brand-mark" style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px' }}>
              <path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', color: 'var(--navy-950)', marginBottom: '8px' }}>Validating Protected Session</h2>
          <p className="muted" style={{ fontSize: '13px' }}>Establishing secure connection with NWSDB Identity Service…</p>
        </section>
      </main>
    );
  }

  if (!user) {
    if (!authScreen) {
      return (
        <PublicHome
          onLogin={() => setAuthScreen('login')}
          onRegister={() => setAuthScreen('register')}
        />
      );
    }

    return (
      <Login
        initialMode={authScreen}
        onBack={() => setAuthScreen(null)}
        onAuthenticated={authenticated}
      />
    );
  }

  // Staff and Admin roles are routed to the comprehensive SOC Operations Console
  if (user.role === 'Staff' || user.role === 'Admin') {
    return <OperationsDashboard user={user} onLogout={logout} />;
  }

  const accountNumber = user.accountNumber || 'NWSDB-0001';

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-label="NWSDB Brand Mark">
              <path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" />
              <path className="brand-wave" d="M8.7 15.2c1.1 1.1 2.3 1.6 3.6 1.6 1.3 0 2.5-.5 3.6-1.6" />
            </svg>
          </div>
          <div>
            <strong>National Water Supply & Drainage Board</strong>
            <span>Consumer Self-Service Portal</span>
          </div>
        </div>

        <div className="user-menu">
          <div className="user-meta">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
          <span className="status-pill status-customer">{user.role}</span>
          <button type="button" className="logout-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-content">
          <p className="eyebrow">National Water Supply & Drainage Board | Sri Lanka</p>
          <h1 id="page-title">Water Account Management</h1>
          <p>
            Monitor verified meter telemetry, evaluate current domestic billing tiers, and complete secure bill settlements online.
          </p>
        </div>
      </section>

      <nav className="section-nav" aria-label="Customer Services Navigation">
        <a href="#overview">Account Overview</a>
        <a href="#usage">Meter Telemetry & Usage</a>
        <a href="#payments">Make a Payment</a>
        <a href="#history">Payment Records</a>
      </nav>

      <section className="card account-card" id="overview" aria-labelledby="account-heading">
        <div className="account-copy">
          <span className="card-kicker">Authenticated Consumer</span>
          <h2 id="account-heading">Water Supply Connection</h2>
          <p>
            Connected consumer profile for <strong>{user.fullName}</strong> with active metered supply.
          </p>
          <div className="account-badges">
            <span className="status-pill status-completed">Active Connection</span>
            <span className="status-pill status-customer">Domestic Standard Tariff</span>
            <span className="status-pill status-operational">Automated Telemetry</span>
          </div>
        </div>

        <div className="account-number-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Account Number</span>
            <button
              type="button"
              className="table-button"
              style={{ padding: '2px 8px', fontSize: '10px' }}
              onClick={() => copyAccountNumber(accountNumber)}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <strong>{accountNumber}</strong>
        </div>
      </section>

      <div id="usage">
        <UsagePanel
          accountNumber={accountNumber}
          refreshTrigger={refreshKey}
        />
      </div>

      <div id="payments">
        <PaymentPanel
          accountNumber={accountNumber}
          onPaymentSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <footer className="footer">
        <span>© National Water Supply & Drainage Board | Sri Lanka. All rights reserved.</span>
        <span>Secure Session ID: {user.userId} | Role: {user.role}</span>
      </footer>
    </main>
  );
}
