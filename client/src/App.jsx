import React from 'react';
import PaymentPanel from './components/PaymentPanel';
import UsagePanel from './components/UsagePanel';

const DEFAULT_ACCOUNT = 'NWSDB-0001';

export default function App() {
  return (
    <main className="app">
      <header className="hero">
        <h1>NWSDB Customer Services</h1>
        <p>View current water usage and make a bill payment.</p>
      </header>

      <section className="card">
        <label htmlFor="accountNumber">Account Number</label>
        <input id="accountNumber" value={DEFAULT_ACCOUNT} readOnly />
      </section>

      <UsagePanel accountNumber={DEFAULT_ACCOUNT} />
      <PaymentPanel accountNumber={DEFAULT_ACCOUNT} />
    </main>
  );
}
