import React, { useEffect, useMemo, useState } from 'react';
import { PaymentApi } from '../api/nwsdbApi';

const CHANNELS = [
  { id: 'NWSDB-Portal', name: 'NWSDB Direct Portal', desc: 'Instant Clearance / Credit Card' },
  { id: 'PayHere', name: 'PayHere Sandbox', desc: 'Secure multi-method payment checkout' }
];

export default function PaymentPanel({ accountNumber, onPaymentSuccess }) {
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState(CHANNELS[0].id);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadHistory = () => {
    PaymentApi.historyForAccount(accountNumber)
      .then((data) => setHistory(data || []))
      .catch((err) => setStatus({ ok: false, message: err.message || 'Unable to load payment history.' }));
  };

  useEffect(() => {
    loadHistory();
  }, [accountNumber]);

  const handlePreset = (val) => {
    setAmount(String(val));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setStatus({ ok: false, message: 'Please specify an amount greater than zero.' });
      return;
    }

    const selectedChannel = CHANNELS.find((item) => item.id === channel);

    setLoading(true);
    try {
      if (channel === 'PayHere') {
        const checkout = await PaymentApi.createPayHereCheckout(accountNumber, numericAmount);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = checkout.actionUrl;
        form.style.display = 'none';

        Object.entries(checkout.fields).forEach(([name, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      const payment = await PaymentApi.create(accountNumber, numericAmount, channel);
      setStatus({
        ok: true,
        message: `Payment reference ${payment.referenceNumber} has been submitted successfully.`
      });
      setActiveReceipt(payment);
      setAmount('');
      loadHistory();
      if (onPaymentSuccess) {
        onPaymentSuccess(payment);
      }
    } catch (err) {
      setStatus({ ok: false, message: err.message || 'Payment submission failed.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((p) => {
      const matchesSearch = !searchTerm ||
        p.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.channel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [history, searchTerm, statusFilter]);

  return (
    <section className="card" id="payments" aria-labelledby="payment-heading">
      <div className="section-heading">
        <div>
          <span className="card-kicker">Digital Bill Settlement</span>
          <h2 id="payment-heading">Make a Water Bill Payment</h2>
          <p>Secure online payment processing via the NWSDB Payment Microservice.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label>Quick Preset Amounts (LKR)</label>
          <div className="amount-presets">
            {[500, 1000, 2500, 5000].map((val) => (
              <button
                key={val}
                type="button"
                className={`preset-chip ${amount === String(val) ? 'active' : ''}`}
                onClick={() => handlePreset(val)}
              >
                Rs. {val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '18px' }}>
          <label>
            Payment Amount (Rs.)
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500.00"
              required
            />
          </label>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Select Settlement Channel</label>
          <div className="channel-picker">
            {CHANNELS.map((c) => (
              <div
                key={c.id}
                className={`channel-card ${channel === c.id ? 'selected' : ''}`}
                onClick={() => setChannel(c.id)}
              >
                <strong>{c.name}</strong>
                <span>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {status && (
          <div className={status.ok ? 'success-banner' : 'error-banner'} role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {status.ok ? (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </>
              )}
            </svg>
            <span>{status.message}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-blue" style={{ minWidth: '180px' }}>
          {loading ? (channel === 'PayHere' ? 'Opening Secure Checkout…' : 'Processing Transaction…') : channel === 'PayHere' ? 'Continue to PayHere' : `Pay Rs. ${amount ? Number(amount).toFixed(2) : '0.00'} Now`}
        </button>
      </form>

      {/* Printable Digital Receipt Card */}
      {activeReceipt && (
        <div className="receipt-drawer">
          <div className="receipt-header">
            <strong>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Official Electronic Receipt Generated
            </strong>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={() => window.print()}
            >
              Print Receipt
            </button>
          </div>
          <div className="receipt-grid">
            <div>
              <span>Reference Number</span>
              <strong>{activeReceipt.referenceNumber}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong style={{ color: 'var(--emerald-700)' }}>
                Rs. {Number(activeReceipt.amount).toFixed(2)}
              </strong>
            </div>
            <div>
              <span>Payment Channel</span>
              <strong>{activeReceipt.channel}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong><span className={`status-pill status-${activeReceipt.status.toLowerCase()}`}>{activeReceipt.status}</span></strong>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Section */}
      <div id="history">
        <div className="history-toolbar">
          <div>
            <h3>Account Payment Records</h3>
            <span className="muted">{filteredHistory.length} of {history.length} transactions shown</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Search reference or channel…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="history-search-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto', margin: 0, padding: '7px 10px', fontSize: '12px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="ops-empty">
            <p>No payment records match your query.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transaction Date</th>
                  <th>Reference Number</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAtUtc).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><strong>{p.referenceNumber}</strong></td>
                    <td>Rs. {Number(p.amount).toFixed(2)}</td>
                    <td>{p.channel}</td>
                    <td>
                      <span className={`status-pill status-${p.status.toLowerCase()}`}>
                        <i aria-hidden="true" />
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-button"
                        onClick={() => setActiveReceipt(p)}
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
