import React, { useEffect, useState } from 'react';
import { UsageApi } from '../api/nwsdbApi';

export default function UsagePanel({ accountNumber }) {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    UsageApi.latest(accountNumber)
      .then((data) => { if (!cancelled) setUsage(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [accountNumber]);

  if (loading) return <section className="card"><p>Loading usage…</p></section>;
  if (error) return <section className="card"><p className="error">Could not load usage: {error}</p></section>;
  if (!usage) return <section className="card"><p>No meter readings yet for this account.</p></section>;

  return (
    <section className="card" aria-labelledby="usage-heading">
      <div className="section-heading">
        <div>
          <h2 id="usage-heading">Current Water Usage</h2>
          <p className="muted">Latest meter information for this account.</p>
        </div>
      </div>

      <dl className="usage-details">
        <dt>Latest reading</dt>
        <dd>{usage.currentCubicMetres} m³ <span className="muted">as of {new Date(usage.readingDateUtc).toLocaleDateString()}</span></dd>

        <dt>Consumption this period</dt>
        <dd>{usage.unitsConsumed} m³</dd>

        <dt>Estimated bill</dt>
        <dd className="amount">Rs. {usage.estimatedBill.toFixed(2)}</dd>
      </dl>
    </section>
  );
}
