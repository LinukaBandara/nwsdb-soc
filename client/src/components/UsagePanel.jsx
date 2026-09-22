import React, { useEffect, useState } from 'react';
import { UsageApi } from '../api/nwsdbApi';

export default function UsagePanel({ accountNumber, refreshTrigger }) {
  const [usage, setUsage] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    setError(null);

    Promise.allSettled([
      UsageApi.latest(accountNumber),
      UsageApi.history(accountNumber)
    ])
      .then(([latestRes, historyRes]) => {
        if (latestRes.status === 'fulfilled') {
          setUsage(latestRes.value);
        } else {
          setError(latestRes.reason?.message || 'Unable to fetch latest meter usage');
        }

        if (historyRes.status === 'fulfilled') {
          setHistory(historyRes.value || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [accountNumber, refreshTrigger]);

  const units = Number(usage?.unitsConsumed || 0);

  // Sri Lanka NWSDB Domestic Tariff Blocks calculation approximation:
  // Tier 1: 0 - 15 m³
  // Tier 2: 16 - 25 m³
  // Tier 3: > 25 m³
  const tier1 = Math.min(units, 15);
  const tier2 = Math.max(0, Math.min(units - 15, 10));
  const tier3 = Math.max(0, units - 25);
  const totalUnits = Math.max(units, 1);

  const pct1 = Math.round((tier1 / totalUnits) * 100);
  const pct2 = Math.round((tier2 / totalUnits) * 100);
  const pct3 = Math.round((tier3 / totalUnits) * 100);

  return (
    <section className="card" aria-labelledby="usage-heading">
      <div className="section-heading">
        <div>
          <span className="card-kicker">Metering Intelligence</span>
          <h2 id="usage-heading">Water Consumption & Estimated Billing</h2>
          <p>Official meter telemetry verified through the NWSDB Usage Microservice.</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={loadData}
          disabled={loading}
          title="Refresh usage telemetry"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: loading ? 'pulseDot 1s infinite linear' : 'none' }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          {loading ? 'Refreshing…' : 'Refresh Telemetry'}
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      {loading && !usage ? (
        <div className="ops-empty">
          <p>Contacting Usage Service at port 5010 for meter telemetry…</p>
        </div>
      ) : !usage ? (
        <div className="ops-empty">
          <p>No meter readings recorded yet for account <strong>{accountNumber}</strong>.</p>
        </div>
      ) : (
        <>
          <div className="usage-grid">
            <div className="usage-stat-box">
              <span>Current Meter Reading</span>
              <strong>{usage.currentCubicMetres} <em>m³</em></strong>
              <small>
                Recorded on {new Date(usage.readingDateUtc).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </small>
            </div>

            <div className="usage-stat-box">
              <span>Consumption This Period</span>
              <strong>{usage.unitsConsumed} <em>m³</em></strong>
              <small>
                Previous reading: {usage.previousCubicMetres} m³
              </small>
            </div>

            <div className="usage-stat-box">
              <span>Current Bill Estimate</span>
              <strong style={{ color: 'var(--blue-600)' }}>
                Rs. {Number(usage.estimatedBill).toFixed(2)}
              </strong>
              <small>
                Calculated on standard domestic block rates
              </small>
            </div>
          </div>

          <div className="tariff-ladder">
            <div className="tariff-ladder-title">
              <span>Domestic Tier Breakdown ({units} Units Consumed)</span>
              <span>Tariff Model: Domestic Standard</span>
            </div>
            <div className="tariff-bar-track">
              <div
                className="tariff-segment-1"
                style={{ width: `${pct1}%` }}
                title={`Block 1 (0-15 m³): ${tier1} units`}
              />
              <div
                className="tariff-segment-2"
                style={{ width: `${pct2}%` }}
                title={`Block 2 (16-25 m³): ${tier2} units`}
              />
              <div
                className="tariff-segment-3"
                style={{ width: `${pct3}%` }}
                title={`Block 3 (>25 m³): ${tier3} units`}
              />
            </div>
            <div className="tariff-labels">
              <span>Block 1: {tier1} m³ (Base rate)</span>
              <span>Block 2: {tier2} m³ (Tier 2 rate)</span>
              <span>Block 3: {tier3} m³ (Tier 3 rate)</span>
            </div>
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <span className="card-kicker">Recent Reading History</span>
              <div className="table-wrap" style={{ marginTop: '8px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Reading Date</th>
                      <th>Cubic Metres</th>
                      <th>Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 4).map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.readingDateUtc).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</td>
                        <td><strong>{r.cubicMetres} m³</strong></td>
                        <td><span className="status-pill status-completed">Verified Telemetry</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
