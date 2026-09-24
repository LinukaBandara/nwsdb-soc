import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PaymentApi } from '../api/nwsdbApi';

const CHANNELS = [
  { id: 'NWSDB-Portal', name: 'NWSDB Direct Portal', desc: 'Instant Clearance / Credit Card' },
  { id: 'PayHere', name: 'PayHere', desc: 'Secure online payment gateway' }
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
  const payHereTimerRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await PaymentApi.historyForAccount(accountNumber);
      const records = data || [];
      setHistory(records);
      return records;
    } catch (err) {
      setStatus({ ok: false, message: err.message || 'Unable to load payment history.' });
      throw err;
    }
  }, [accountNumber]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stopPayHerePolling = useCallback(() => {
    if (payHereTimerRef.current) {
      window.clearTimeout(payHereTimerRef.current);
      payHereTimerRef.current = null;
    }
  }, []);

  const pollPayHereStatus = useCallback(async (orderId, attempt = 0) => {
    if (!orderId || !accountNumber) return;

    try {
      const payments = await loadHistory();
      const payment = payments.find((p) => p.referenceNumber === orderId);

      if (payment?.status === 'Completed') {
        stopPayHerePolling();
        setStatus({
          ok: true,
          message: `Payment ${orderId} completed successfully.`
        });
        setActiveReceipt(payment);
        sessionStorage.removeItem('nwsdb_payhere_order');
        if (onPaymentSuccess) onPaymentSuccess(payment);
        return;
      }

      if (payment?.status === 'Failed') {
        stopPayHerePolling();
        setStatus({
          ok: false,
          message: `Payment ${orderId} failed or was cancelled.`
        });
        sessionStorage.removeItem('nwsdb_payhere_order');
        return;
      }

      if (attempt >= 11) {
        stopPayHerePolling();
        setStatus({
          ok: true,
          message: 'Payment is still pending. PayHere has not sent final confirmation yet.'
        });
        return;
      }

      payHereTimerRef.current = window.setTimeout(
        () => pollPayHereStatus(orderId, attempt + 1),
        1500
      );
    } catch {
      if (attempt >= 11) {
        stopPayHerePolling();
        setStatus({
          ok: false,
          message: 'Unable to confirm PayHere payment status.'
        });
        return;
      }

      payHereTimerRef.current = window.setTimeout(
        () => pollPayHereStatus(orderId, attempt + 1),
        1500
      );
    }
  }, [accountNumber, loadHistory, onPaymentSuccess, stopPayHerePolling]);

  useEffect(() => {
    const handlePayHereMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'NWSDB_PAYHERE_RETURN') return;
      if (!event.data.orderId) return;

      setStatus({
        ok: true,
        message: 'PayHere returned. Confirming payment status...'
      });
      stopPayHerePolling();
      pollPayHereStatus(event.data.orderId, 0);
    };

    window.addEventListener('message', handlePayHereMessage);
    return () => window.removeEventListener('message', handlePayHereMessage);
  }, [pollPayHereStatus, stopPayHerePolling]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payhere = params.get('payhere');
    const orderId =
      params.get('orderId') ||
      sessionStorage.getItem('nwsdb_payhere_order');

    if ((payhere === 'return' || payhere === 'cancel') && orderId) {
      const isPopup = Boolean(window.opener && !window.opener.closed);

      if (isPopup) {
        window.opener.postMessage(
          { type: 'NWSDB_PAYHERE_RETURN', orderId, result: payhere },
          window.location.origin
        );

        window.setTimeout(() => {
          try {
            window.close();
          } catch {
            // Browser may refuse to close a non-script-opened window.
          }
        }, 500);

        return;
      }

      setStatus({
        ok: true,
        message: 'Returned from PayHere. Confirming payment status...'
      });

      stopPayHerePolling();
      pollPayHereStatus(orderId, 0);

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, [pollPayHereStatus, stopPayHerePolling]);

  useEffect(() => {
    return () => stopPayHerePolling();
  }, [stopPayHerePolling]);

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

    setLoading(true);
    let payHerePopup = null;

    try {
      if (channel === 'PayHere') {
        // Open the popup immediately from the button click so Edge does not
        // treat it as a blocked popup after the async API request.
        payHerePopup = window.open(
          '',
          'nwsdb_payhere_checkout',
          'popup=yes,width=520,height=760,resizable=yes,scrollbars=yes'
        );

        if (!payHerePopup) {
          setStatus({
            ok: false,
            message: 'PayHere checkout was blocked by the browser. Please allow pop-ups for the NWSDB portal and try again.'
          });
          return;
        }

        payHerePopup.document.title = 'Opening PayHere…';

        const checkout = await PaymentApi.createPayHereCheckout(accountNumber, numericAmount);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = checkout.actionUrl;
        form.target = 'nwsdb_payhere_checkout';
        form.style.display = 'none';

        Object.entries(checkout.fields).forEach(([name, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);

        const orderId = checkout.fields.order_id;
        sessionStorage.setItem('nwsdb_payhere_order', orderId);

        payHerePopup.focus();
        form.submit();
        setStatus({
          ok: true,
          message: 'PayHere checkout opened in a separate window. Keep this NWSDB window open while completing payment.'
        });
        setLoading(false);
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
          <div className="receipt-paper" id="printable-receipt">
            <div className="receipt-header">
              <div className="receipt-branding">
                <div className="receipt-logo">N</div>
                <div>
                  <strong>NATIONAL WATER SUPPLY & DRAINAGE BOARD</strong>
                  <span>Customer Services · Electronic Payment Receipt</span>
                </div>
              </div>
              <div className="receipt-actions">
                <button type="button" className="btn-secondary receipt-print-button" onClick={() => window.print()}>
                  Print Receipt
                </button>
                <button type="button" className="receipt-close-button" onClick={() => setActiveReceipt(null)} aria-label="Close receipt">
                  ×
                </button>
              </div>
            </div>
            <div className="receipt-title-row">
              <div>
                <span>PAYMENT RECEIPT</span>
                <strong>{activeReceipt.referenceNumber}</strong>
              </div>
              <span className="receipt-paid-badge">{String(activeReceipt.status || '').toUpperCase()}</span>
            </div>
            <div className="receipt-grid">
              <div><span>Account Number</span><strong>{activeReceipt.accountNumber || accountNumber}</strong></div>
              <div><span>Payment Date</span><strong>{activeReceipt.createdAtUtc ? new Date(activeReceipt.createdAtUtc).toLocaleString() : new Date().toLocaleString()}</strong></div>
              <div><span>Payment Channel</span><strong>{activeReceipt.channel}</strong></div>
              <div><span>Status</span><strong>{activeReceipt.status}</strong></div>
            </div>
            <div className="receipt-total">
              <span>Amount Paid</span>
              <strong>Rs. {Number(activeReceipt.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <p className="receipt-note">This electronic receipt confirms that the payment was recorded by the NWSDB Customer Services system.</p>
          </div>        </div>
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
