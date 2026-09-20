import React, { useEffect, useState } from 'react';
import { UsageApi } from '../api/nwsdbApi';

export default function UsagePanel({ accountNumber }) {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    UsageApi.latest(accountNumber)
      .then((data) => { if (!cancelled) setUsage(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountNumber]);

  if (loading) return <p>Loading usage…</p>;
  if (error) return <p className="error">Could not load usage: {error}</p>;
  if (!usage) return <p>No meter readings yet for this account.</p>;

  return (
    <section className="card">
      <h2>Current Water Usage</h2>
      <dl>
        <dt>Latest reading</dt>
        <dd>{usage.currentCubicMetres} m³ (as of {new Date(usage.readingDateUtc).toLocaleDateString()})</dd>
        <dt>Consumption this period</dt>
        <dd>{usage.unitsConsumed} m³</dd>
        <dt>Estimated bill</dt>
        <dd>Rs. {usage.estimatedBill.toFixed(2)}</dd>
      </dl>
    </section>
  );
}
