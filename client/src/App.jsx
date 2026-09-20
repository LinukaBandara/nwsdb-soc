import React from 'react';
import PaymentPanel from './components/PaymentPanel';
import UsagePanel from './components/UsagePanel';

const DEFAULT_ACCOUNT = 'NWSDB-0001';

export default function App() {
  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">National Water Supply & Drainage Board</p>
        <h1>NWSDB Customer Services</h1>
        <p>View current water usage and make a bill payment.</p>
      </header>

      <section className="card account-card" aria-labelledby="account-heading">
        <div>
          <h2 id="account-heading">Customer Account</h2>
          <p className="muted">The account used for this service demonstration.</p>
        </div>
        <label htmlFor="accountNumber">
          Account Number
          <input id="accountNumber" value={DEFAULT_ACCOUNT} readOnly />
        </label>
      </section>

      <UsagePanel accountNumber={DEFAULT_ACCOUNT} />
      <PaymentPanel accountNumber={DEFAULT_ACCOUNT} />
    </main>
  );
}
