import React, { useEffect, useState } from 'react';
import { PaymentApi } from '../api/nwsdbApi';

const CHANNELS = ['NWSDB-Portal', 'BankApp', 'eZCash', 'FrimiWallet'];

export default function PaymentPanel({ accountNumber }) {
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);

  const loadHistory = () => {
    PaymentApi.historyForAccount(accountNumber)
      .then(setHistory)
      .catch((err) => setStatus({ ok: false, message: err.message }));
  };

  useEffect(loadHistory, [accountNumber]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const numericAmount = Number(amount);
      if (!numericAmount || numericAmount <= 0) {
        setStatus({ ok: false, message: 'Enter an amount greater than zero.' });
        return;
      }
      const payment = await PaymentApi.create(accountNumber, numericAmount, channel);
      setStatus({ ok: true, message: `Payment ${payment.referenceNumber} completed.` });
      setAmount('');
      loadHistory();
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    }
  };

  return (
    <section className="card">
      <h2>Make a Payment</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Amount (Rs.)
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Pay via
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="submit">Pay Now</button>
      </form>

      {status && (
        <p className={status.ok ? 'success' : 'error'}>{status.message}</p>
      )}

      <h3>Payment History</h3>
      {history.length === 0 ? (
        <p>No payments recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Channel</th><th>Status</th><th>Reference</th></tr>
          </thead>
          <tbody>
            {history.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.createdAtUtc).toLocaleString()}</td>
                <td>Rs. {p.amount.toFixed(2)}</td>
                <td>{p.channel}</td>
                <td>{p.status}</td>
                <td>{p.referenceNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
