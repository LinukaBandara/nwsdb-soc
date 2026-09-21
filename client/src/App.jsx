import React from 'react';
import PaymentPanel from './components/PaymentPanel';
import UsagePanel from './components/UsagePanel';

const DEFAULT_ACCOUNT = 'NWSDB-0001';

export default function App() {
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-label="Water">
              <path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" />
              <path className="brand-wave" d="M8.7 15.2c1.1 1.1 2.3 1.6 3.6 1.6 1.3 0 2.5-.5 3.6-1.6" />
            </svg>
          </div>
          <div>
            <strong>NWSDB</strong>
            <span>Customer Portal</span>
          </div>
        </div>
        <span className="service-label">Water Services</span>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-content">
          <p className="eyebrow">National Water Supply & Drainage Board</p>
          <h1 id="page-title">Your water account</h1>
          <p>View your latest usage and make a water bill payment securely.</p>
        </div>
      </section>

      <nav className="section-nav" aria-label="Customer services">
        <a href="#usage">Usage</a>
        <a href="#payment">Payments</a>
        <a href="#history">Payment history</a>
      </nav>

      <section className="card account-card" aria-labelledby="account-heading">
        <div className="account-copy">
          <span className="card-kicker">Customer account</span>
          <h2 id="account-heading">Account overview</h2>
          <p className="muted">Account used for this service demonstration.</p>
        </div>
        <label htmlFor="accountNumber">
          Account number
          <input id="accountNumber" value={DEFAULT_ACCOUNT} readOnly />
        </label>
      </section>

      <div id="usage">
        <UsagePanel accountNumber={DEFAULT_ACCOUNT} />
      </div>

      <div id="payment">
        <PaymentPanel accountNumber={DEFAULT_ACCOUNT} />
      </div>

      <footer className="footer">
        <span>NWSDB Customer Services</span>
      </footer>
    </main>
  );
}
