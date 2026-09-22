import React, { useEffect, useState } from 'react';
import { PaymentApi, UsageApi, AuthApi } from '../api/nwsdbApi';

function StatusPill({ status }) {
  return <span className={`status-pill status-${String(status).toLowerCase()}`}>{status}</span>;
}

export default function OperationsDashboard({ user, onLogout }) {
  const [accountNumber, setAccountNumber] = useState('NWSDB-0001');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [usage, setUsage] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    fullName: '', email: '', password: '', role: 'Staff', accountNumber: ''
  });

  const isAdmin = user.role === 'Admin';

  const loadAccount = async (account = accountNumber) => {
    const value = account.trim();
    if (!value) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const [latest, history, paymentHistory] = await Promise.all([
        UsageApi.latest(value),
        UsageApi.history(value),
        PaymentApi.historyForAccount(value)
      ]);
      setSelectedAccount(value);
      setUsage(latest);
      setUsageHistory(history);
      setPayments(paymentHistory);
    } catch (e) {
      setError(e.message);
      setUsage(null); setUsageHistory([]); setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const recordReading = async (e) => {
    e.preventDefault();
    if (!reading || !selectedAccount) return;
    setError(''); setMessage('');
    try {
      await UsageApi.record(selectedAccount, reading);
      setReading('');
      setMessage('Meter reading recorded successfully.');
      await loadAccount(selectedAccount);
    } catch (e) { setError(e.message); }
  };

  const updatePaymentStatus = async (id, status) => {
    setError(''); setMessage('');
    try {
      await PaymentApi.updateStatus(id, status);
      setMessage(`Payment #${id} updated to ${status}.`);
      await loadAccount(selectedAccount);
    } catch (e) { setError(e.message); }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    try { setUsers(await AuthApi.users()); } catch (e) { setError(e.message); }
  };

  useEffect(() => { loadUsers(); }, [isAdmin]);

  const createUser = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await AuthApi.createUser(newUser);
      setNewUser({ fullName: '', email: '', password: '', role: 'Staff', accountNumber: '' });
      setMessage('User created successfully.');
      await loadUsers();
    } catch (e) { setError(e.message); }
  };

  return (
    <main className="ops-app">
      <header className="ops-topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span>W</span></div>
          <div><strong>NWSDB</strong><span>{isAdmin ? 'Administration Console' : 'Staff Operations'}</span></div>
        </div>
        <div className="ops-user">
          <div><strong>{user.fullName}</strong><span>{user.role} · {user.email}</span></div>
          <button type="button" className="logout-button" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <section className="ops-hero">
        <div>
          <p className="eyebrow">National Water Supply & Drainage Board</p>
          <h1>{isAdmin ? 'System administration' : 'Service operations'}</h1>
          <p>Manage customer service activity through the protected service APIs.</p>
        </div>
      </section>

      <section className="ops-stats">
        <div><span>Role</span><strong>{user.role}</strong></div>
        <div><span>Selected account</span><strong>{selectedAccount || 'None'}</strong></div>
        <div><span>Payments loaded</span><strong>{payments.length}</strong></div>
        <div><span>Usage records</span><strong>{usageHistory.length}</strong></div>
      </section>

      <section className="ops-card">
        <div className="ops-heading">
          <div><span className="card-kicker">Customer service</span><h2>Account workspace</h2></div>
          <span className="ops-badge">Protected API</span>
        </div>
        <div className="ops-search">
          <label>Customer account number
            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="NWSDB-0001" />
          </label>
          <button type="button" onClick={() => loadAccount()} disabled={loading}>{loading ? 'Loading…' : 'Load account'}</button>
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        {usage && (
          <div className="ops-grid">
            <article className="ops-panel">
              <div className="ops-panel-title"><h3>Latest usage</h3><StatusPill status="Live" /></div>
              <div className="ops-metrics">
                <div><span>Current reading</span><strong>{usage.currentCubicMetres} m³</strong></div>
                <div><span>Previous</span><strong>{usage.previousCubicMetres} m³</strong></div>
                <div><span>Consumed</span><strong>{usage.unitsConsumed} m³</strong></div>
                <div><span>Estimated bill</span><strong>Rs. {Number(usage.estimatedBill).toFixed(2)}</strong></div>
              </div>
            </article>

            <article className="ops-panel">
              <div className="ops-panel-title"><h3>Record meter reading</h3><span className="ops-badge">Staff / Admin</span></div>
              <form className="ops-inline-form" onSubmit={recordReading}>
                <label>New reading (m³)
                  <input type="number" min="0" step="0.01" value={reading} onChange={e => setReading(e.target.value)} required />
                </label>
                <button type="submit">Record reading</button>
              </form>
            </article>
          </div>
        )}

        {selectedAccount && (
          <>
            <div className="ops-section">
              <div className="ops-panel-title"><h3>Payment history</h3><span>{payments.length} records</span></div>
              <div className="table-wrap">
                <table><thead><tr><th>Reference</th><th>Amount</th><th>Channel</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{payments.length ? payments.map(p => (
                    <tr key={p.id}><td>{p.referenceNumber}</td><td>Rs. {Number(p.amount).toFixed(2)}</td><td>{p.channel}</td><td><StatusPill status={p.status} /></td><td>
                      {p.status === 'Pending' ? <button className="table-button" type="button" onClick={() => updatePaymentStatus(p.id, 'Completed')}>Complete</button> : <span className="muted">No action</span>}
                    </td></tr>
                  )) : <tr><td colSpan="5" className="empty-cell">No payments for this account.</td></tr>}</tbody>
                </table>
              </div>
            </div>

            <div className="ops-section">
              <div className="ops-panel-title"><h3>Meter history</h3><span>{usageHistory.length} records</span></div>
              <div className="table-wrap">
                <table><thead><tr><th>Reading</th><th>Date (UTC)</th></tr></thead>
                  <tbody>{usageHistory.length ? usageHistory.map(r => <tr key={r.id}><td>{r.cubicMetres} m³</td><td>{new Date(r.readingDateUtc).toLocaleString()}</td></tr>) : <tr><td colSpan="2" className="empty-cell">No readings found.</td></tr>}</tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {isAdmin && (
        <section className="ops-card">
          <div className="ops-heading">
            <div><span className="card-kicker">Access control</span><h2>User management</h2></div>
            <span className="ops-badge">Admin only</span>
          </div>
          <div className="ops-grid">
            <form className="ops-panel" onSubmit={createUser}>
              <div className="ops-panel-title"><h3>Create account</h3></div>
              <label>Full name<input value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName:e.target.value})} required /></label>
              <label>Email<input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} required /></label>
              <label>Temporary password<input type="password" minLength="6" value={newUser.password} onChange={e => setNewUser({...newUser, password:e.target.value})} required /></label>
              <div className="form-grid">
                <label>Role<select value={newUser.role} onChange={e => setNewUser({...newUser, role:e.target.value})}><option>Staff</option><option>Customer</option><option>Partner</option><option>Admin</option></select></label>
                <label>Account number<input value={newUser.accountNumber} onChange={e => setNewUser({...newUser, accountNumber:e.target.value})} placeholder="Optional" /></label>
              </div>
              <button type="submit">Create user</button>
            </form>

            <article className="ops-panel">
              <div className="ops-panel-title"><h3>Registered users</h3><span>{users.length} accounts</span></div>
              <div className="table-wrap">
                <table><thead><tr><th>Name</th><th>Role</th><th>Account</th></tr></thead>
                  <tbody>{users.map(u => <tr key={u.id}><td><strong>{u.fullName}</strong><br /><span className="muted">{u.email}</span></td><td><StatusPill status={u.role} /></td><td>{u.accountNumber || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      )}

      <footer className="footer"><span>NWSDB SOC · {isAdmin ? 'Administration' : 'Operations'}</span><span>JWT role-based access control</span></footer>
    </main>
  );
}
