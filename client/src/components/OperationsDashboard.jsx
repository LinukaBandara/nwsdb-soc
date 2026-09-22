import React, { useEffect, useMemo, useState } from 'react';
import { PaymentApi, UsageApi, AuthApi } from '../api/nwsdbApi';

function StatusPill({ status }) {
  return <span className={`status-pill status-${String(status).toLowerCase()}`}>{status}</span>;
}

function Icon({ name }) {
  const paths = {
    grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
    users: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7.5a4 4 0 0 1 0 7.75M21 20v-2a4 4 0 0 0-3-3.87',
    water: 'M12 2S5 10 5 14a7 7 0 0 0 14 0c0-4-7-12-7-12Zm-3 13a3 3 0 0 0 3 3',
    card: 'M3 6h18v12H3V6Zm0 4h18M7 15h3',
    meter: 'M4 18a8 8 0 1 1 16 0M12 10v8m0 0-3-3m3 3 3-3',
    shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m9-8h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64',
    logout: 'M10 17l5-5-5-5m5 5H3m13-7V3a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3m12 12v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3',
    search: 'm21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z'
  };
  return <svg className="ops-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

export default function OperationsDashboard({ user, onLogout }) {
  const [active, setActive] = useState('dashboard');
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
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Staff', accountNumber: '' });

  const isAdmin = user.role === 'Admin';

  const loadAccount = async (account = accountNumber) => {
    const value = account.trim();
    if (!value) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const [latest, history, paymentHistory] = await Promise.all([
        UsageApi.latest(value), UsageApi.history(value), PaymentApi.historyForAccount(value)
      ]);
      setSelectedAccount(value);
      setUsage(latest);
      setUsageHistory(history);
      setPayments(paymentHistory);
    } catch (e) {
      setError(e.message);
      setUsage(null); setUsageHistory([]); setPayments([]);
    } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    try { setUsers(await AuthApi.users()); } catch (e) { setError(e.message); }
  };

  useEffect(() => { loadUsers(); loadAccount('NWSDB-0001'); }, [isAdmin]);

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

  const pendingPayments = payments.filter(p => p.status === 'Pending').length;
  const completedPayments = payments.filter(p => p.status === 'Completed').length;
  const avgUsage = useMemo(() => {
    if (!usageHistory.length) return 0;
    return (usageHistory.reduce((sum, r) => sum + Number(r.cubicMetres || 0), 0) / usageHistory.length).toFixed(1);
  }, [usageHistory]);

  const nav = [
    ['dashboard', 'Dashboard', 'grid'],
    ['customers', 'Customers', 'users'],
    ['usage', 'Usage & Metering', 'water'],
    ['payments', 'Payments', 'card'],
    ['readings', 'Meter Readings', 'meter'],
    ...(isAdmin ? [['users', 'User Management', 'shield']] : []),
    ['settings', 'System & API', 'settings']
  ];

  const title = {
    dashboard: 'Operations overview',
    customers: 'Customer operations',
    usage: 'Usage & metering',
    payments: 'Payment operations',
    readings: 'Meter readings',
    users: 'User management',
    settings: 'System & API status'
  }[active];

  const subtitle = {
    dashboard: 'Monitor customer service activity across the protected NWSDB service layer.',
    customers: 'Look up an account and review its service activity.',
    usage: 'Review consumption, estimated billing and historical meter activity.',
    payments: 'Review transactions and process pending payments.',
    readings: 'Record and review meter readings for customer accounts.',
    users: 'Create and review system accounts and role assignments.',
    settings: 'Review the service architecture and access controls used by this dashboard.'
  }[active];

  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <div className="brand-mark" aria-hidden="true"><span>W</span></div>
          <div><strong>NWSDB</strong><span>Service Operations</span></div>
        </div>
        <div className="ops-nav-label">WORKSPACE</div>
        <nav>
          {nav.map(([id, label, icon]) => (
            <button key={id} type="button" className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
              <Icon name={icon} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          <div className="ops-role"><StatusPill status={user.role} /><span>Protected session</span></div>
          <button type="button" className="ops-signout" onClick={onLogout}><Icon name="logout" /><span>Sign out</span></button>
        </div>
      </aside>

      <main className="ops-main">
        <header className="ops-header">
          <div className="ops-mobile-brand"><div className="brand-mark"><span>W</span></div><strong>NWSDB</strong></div>
          <div className="ops-breadcrumb">Operations / <strong>{title}</strong></div>
          <div className="ops-header-user"><div><strong>{user.fullName}</strong><span>{user.role}</span></div><div className="ops-avatar">{user.fullName?.charAt(0)?.toUpperCase() || 'U'}</div></div>
        </header>

        <section className="ops-content">
          <div className="ops-page-heading">
            <div><p className="eyebrow">National Water Supply & Drainage Board</p><h1>{title}</h1><p>{subtitle}</p></div>
            <div className="ops-page-actions"><StatusPill status="System online" /></div>
          </div>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          {active === 'dashboard' && (
            <>
              <div className="ops-kpi-grid">
                <div className="ops-kpi"><span>Total loaded payments</span><strong>{payments.length}</strong><small>Current account</small></div>
                <div className="ops-kpi"><span>Pending payments</span><strong>{pendingPayments}</strong><small>Requires processing</small></div>
                <div className="ops-kpi"><span>Usage records</span><strong>{usageHistory.length}</strong><small>Meter history</small></div>
                <div className="ops-kpi"><span>Latest consumption</span><strong>{usage ? `${usage.unitsConsumed} m³` : '—'}</strong><small>Selected account</small></div>
              </div>

              <div className="ops-dashboard-grid">
                <section className="ops-panel ops-large">
                  <div className="ops-panel-title"><div><span className="card-kicker">Account intelligence</span><h2>Consumption overview</h2></div><span className="ops-caption">{selectedAccount || 'NWSDB-0001'}</span></div>
                  {usage ? <div className="ops-overview">
                    <div className="ops-big-number"><span>Current reading</span><strong>{usage.currentCubicMetres} <em>m³</em></strong><small>Estimated bill Rs. {Number(usage.estimatedBill).toFixed(2)}</small></div>
                    <div className="ops-bars">{usageHistory.slice(0, 7).reverse().map((r, i) => <div className="ops-bar-item" key={r.id}><div className="ops-bar" style={{height:`${Math.max(12, Math.min(100, Number(r.cubicMetres || 0) / Math.max(1, Number(usage.currentCubicMetres || 1)) * 100))}%`}}></div><span>{i + 1}</span></div>)}</div>
                  </div> : <div className="ops-empty">Load an account to populate operational metrics.</div>}
                </section>

                <section className="ops-panel">
                  <div className="ops-panel-title"><div><span className="card-kicker">Account</span><h2>Quick lookup</h2></div><Icon name="search" /></div>
                  <form className="ops-lookup" onSubmit={e => { e.preventDefault(); loadAccount(); }}>
                    <label>Customer account<input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="NWSDB-0001" /></label>
                    <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Open account'}</button>
                  </form>
                  {usage && <div className="ops-mini-grid"><div><span>Average reading</span><strong>{avgUsage} m³</strong></div><div><span>Payments</span><strong>{payments.length}</strong></div></div>}
                </section>
              </div>

              <section className="ops-panel ops-table-panel">
                <div className="ops-panel-title"><div><span className="card-kicker">Transactions</span><h2>Recent payments</h2></div><button type="button" className="ops-text-button" onClick={() => setActive('payments')}>View all →</button></div>
                <PaymentTable payments={payments.slice(0, 5)} onComplete={updatePaymentStatus} />
              </section>
            </>
          )}

          {active === 'customers' && <AccountWorkspace {...{accountNumber,setAccountNumber,loadAccount,loading,usage,payments,usageHistory,selectedAccount}} />}
          {active === 'usage' && <UsageWorkspace usage={usage} usageHistory={usageHistory} selectedAccount={selectedAccount} accountNumber={accountNumber} setAccountNumber={setAccountNumber} loadAccount={loadAccount} loading={loading} />}
          {active === 'payments' && <section className="ops-panel ops-table-panel"><div className="ops-panel-title"><div><span className="card-kicker">Payment service</span><h2>Transaction history</h2></div><StatusPill status={`${payments.length} records`} /></div><PaymentTable payments={payments} onComplete={updatePaymentStatus} /></section>}
          {active === 'readings' && <ReadingWorkspace usageHistory={usageHistory} selectedAccount={selectedAccount} reading={reading} setReading={setReading} recordReading={recordReading} />}
          {active === 'users' && isAdmin && <UserWorkspace users={users} newUser={newUser} setNewUser={setNewUser} createUser={createUser} />}
          {active === 'settings' && <SystemWorkspace isAdmin={isAdmin} user={user} />}
        </section>
      </main>
    </div>
  );
}

function AccountWorkspace({ accountNumber, setAccountNumber, loadAccount, loading, usage, payments, usageHistory, selectedAccount }) {
  return <div className="ops-stack"><section className="ops-panel"><div className="ops-panel-title"><div><span className="card-kicker">Customer lookup</span><h2>Account workspace</h2></div></div><form className="ops-search" onSubmit={e => {e.preventDefault();loadAccount();}}><label>Customer account number<input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} /></label><button type="submit" disabled={loading}>{loading?'Loading…':'Load account'}</button></form></section>{selectedAccount && <><section className="ops-detail-grid"><Metric title="Current usage" value={usage ? `${usage.unitsConsumed} m³` : '—'} note="Units consumed" /><Metric title="Estimated bill" value={usage ? `Rs. ${Number(usage.estimatedBill).toFixed(2)}` : '—'} note="Current estimate" /><Metric title="Payments" value={payments.length} note="Recorded transactions" /><Metric title="Readings" value={usageHistory.length} note="Meter history" /></section><section className="ops-panel"><div className="ops-panel-title"><h2>Account summary</h2><span>{selectedAccount}</span></div>{usage ? <div className="ops-detail-list"><div><span>Current reading</span><strong>{usage.currentCubicMetres} m³</strong></div><div><span>Previous reading</span><strong>{usage.previousCubicMetres} m³</strong></div><div><span>Units consumed</span><strong>{usage.unitsConsumed} m³</strong></div><div><span>Estimated bill</span><strong>Rs. {Number(usage.estimatedBill).toFixed(2)}</strong></div></div> : <div className="ops-empty">No usage data available.</div>}</section></>}</div>;
}

function UsageWorkspace({ usage, usageHistory, selectedAccount, accountNumber, setAccountNumber, loadAccount, loading }) {
  return <div className="ops-stack"><section className="ops-panel"><div className="ops-panel-title"><div><span className="card-kicker">Usage service</span><h2>Consumption analysis</h2></div></div><form className="ops-search" onSubmit={e=>{e.preventDefault();loadAccount();}}><label>Account<input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} /></label><button type="submit" disabled={loading}>{loading?'Loading…':'Load usage'}</button></form></section><section className="ops-panel">{usage ? <div className="ops-detail-list"><div><span>Account</span><strong>{selectedAccount}</strong></div><div><span>Current</span><strong>{usage.currentCubicMetres} m³</strong></div><div><span>Previous</span><strong>{usage.previousCubicMetres} m³</strong></div><div><span>Consumed</span><strong>{usage.unitsConsumed} m³</strong></div><div><span>Estimated bill</span><strong>Rs. {Number(usage.estimatedBill).toFixed(2)}</strong></div></div> : <div className="ops-empty">Load an account to inspect usage.</div>}</section><section className="ops-panel"><div className="ops-panel-title"><h2>Meter history</h2><span>{usageHistory.length} records</span></div><MeterTable rows={usageHistory}/></section></div>;
}

function ReadingWorkspace({ usageHistory, selectedAccount, reading, setReading, recordReading }) {
  return <div className="ops-stack"><section className="ops-panel"><div className="ops-panel-title"><div><span className="card-kicker">Metering service</span><h2>Record reading</h2></div><StatusPill status="Staff / Admin" /></div>{selectedAccount ? <form className="ops-inline-form" onSubmit={recordReading}><label>Account<input value={selectedAccount} readOnly /></label><label>New reading (m³)<input type="number" min="0" step="0.01" value={reading} onChange={e=>setReading(e.target.value)} required /></label><button type="submit">Record reading</button></form> : <div className="ops-empty">Select an account from Customers first.</div>}</section><section className="ops-panel"><div className="ops-panel-title"><h2>Reading history</h2><span>{usageHistory.length} records</span></div><MeterTable rows={usageHistory}/></section></div>;
}

function UserWorkspace({ users, newUser, setNewUser, createUser }) {
  return <div className="ops-dashboard-grid"><form className="ops-panel" onSubmit={createUser}><div className="ops-panel-title"><div><span className="card-kicker">Access control</span><h2>Create account</h2></div><StatusPill status="Admin only" /></div><label>Full name<input value={newUser.fullName} onChange={e=>setNewUser({...newUser,fullName:e.target.value})} required /></label><label>Email<input type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} required /></label><label>Temporary password<input type="password" minLength="6" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} required /></label><div className="form-grid"><label>Role<select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}><option>Staff</option><option>Customer</option><option>Partner</option><option>Admin</option></select></label><label>Account number<input value={newUser.accountNumber} onChange={e=>setNewUser({...newUser,accountNumber:e.target.value})} placeholder="Optional" /></label></div><button type="submit">Create user</button></form><section className="ops-panel"><div className="ops-panel-title"><div><span className="card-kicker">Directory</span><h2>Registered users</h2></div><span>{users.length} accounts</span></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Account</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.fullName}</strong><br/><span className="muted">{u.email}</span></td><td><StatusPill status={u.role}/></td><td>{u.accountNumber||'—'}</td></tr>)}</tbody></table></div></section></div>;
}

function SystemWorkspace({ isAdmin, user }) {
  const services = [['Identity Service','JWT authentication & roles','5021'],['Payment Service','Payment lifecycle API','5000'],['Usage Service','Meter usage API','5010']];
  return <div className="ops-stack"><section className="ops-panel"><div className="ops-panel-title"><div><span className="card-kicker">Architecture</span><h2>Service health</h2></div><StatusPill status="Operational"/></div><div className="service-list">{services.map(([name,desc,port])=><div key={name}><div className="service-dot"/><div><strong>{name}</strong><span>{desc}</span></div><code>localhost:{port}</code></div>)}</div></section><section className="ops-panel"><div className="ops-panel-title"><div><span className="card-kicker">Security</span><h2>Current access context</h2></div></div><div className="ops-detail-list"><div><span>Authenticated user</span><strong>{user.fullName}</strong></div><div><span>Role</span><strong>{user.role}</strong></div><div><span>Authorization</span><strong>JWT Bearer + role policies</strong></div><div><span>Administrative access</span><strong>{isAdmin ? 'Enabled' : 'Restricted'}</strong></div></div></section></div>;
}

function PaymentTable({ payments, onComplete }) {
  return <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Amount</th><th>Channel</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.length ? payments.map(p=><tr key={p.id}><td><strong>{p.referenceNumber}</strong></td><td>Rs. {Number(p.amount).toFixed(2)}</td><td>{p.channel}</td><td><StatusPill status={p.status}/></td><td>{p.status==='Pending'?<button className="table-button" type="button" onClick={()=>onComplete(p.id,'Completed')}>Complete</button>:<span className="muted">Processed</span>}</td></tr>):<tr><td colSpan="5" className="empty-cell">No payments for this account.</td></tr>}</tbody></table></div>;
}

function MeterTable({ rows }) {
  return <div className="table-wrap"><table><thead><tr><th>Reading</th><th>Date (UTC)</th></tr></thead><tbody>{rows.length?rows.map(r=><tr key={r.id}><td><strong>{r.cubicMetres} m³</strong></td><td>{new Date(r.readingDateUtc).toLocaleString()}</td></tr>):<tr><td colSpan="2" className="empty-cell">No readings found.</td></tr>}</tbody></table></div>;
}

function Metric({ title, value, note }) {
  return <div className="ops-kpi"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>;
}
