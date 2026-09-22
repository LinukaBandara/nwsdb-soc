import React, { useEffect, useMemo, useState } from 'react';
import { PaymentApi, UsageApi, AuthApi, HealthApi } from '../api/nwsdbApi';

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  let variant = 'customer';
  if (s.includes('completed') || s.includes('operational') || s.includes('healthy') || s.includes('active')) variant = 'completed';
  else if (s.includes('pending') || s.includes('processing')) variant = 'pending';
  else if (s.includes('failed') || s.includes('offline') || s.includes('unreachable') || s.includes('error')) variant = 'failed';
  else if (s.includes('admin')) variant = 'admin-only';

  return (
    <span className={`status-pill status-${variant}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
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
    search: 'm21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
    refresh: 'M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67',
    check: 'M20 6 9 17l-5-5'
  };
  return (
    <svg className="ops-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}

export default function OperationsDashboard({ user, onLogout }) {
  const [active, setActive] = useState('dashboard');
  const [accountNumber, setAccountNumber] = useState('NWSDB-0001');
  const [selectedAccount, setSelectedAccount] = useState('NWSDB-0001');
  const [usage, setUsage] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Staff', accountNumber: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [healthStatus, setHealthStatus] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);

  const isAdmin = user.role === 'Admin';
  const onlineServices = healthStatus.filter((service) => service.ok).length;
  const healthLabel = healthStatus.length ? `${onlineServices}/${healthStatus.length} Services Online` : 'Checking Services';

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const results = await HealthApi.checkAll();
      setHealthStatus(results);
    } catch {
      // ignore
    } finally {
      setHealthLoading(false);
    }
  };

  const loadAccount = async (account = accountNumber) => {
    const value = (account || '').trim();
    if (!value) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const results = await Promise.allSettled([
        UsageApi.latest(value),
        UsageApi.history(value),
        PaymentApi.historyForAccount(value)
      ]);
      const [latestResult, historyResult, paymentsResult] = results;
      const latest = latestResult.status === 'fulfilled' ? latestResult.value : null;
      const history = historyResult.status === 'fulfilled' ? (historyResult.value || []) : [];
      const paymentHistory = paymentsResult.status === 'fulfilled' ? (paymentsResult.value || []) : [];

      setSelectedAccount(value);
      setUsage(latest);
      setUsageHistory(history);
      setPayments(paymentHistory);
      setLastUpdated(new Date());

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length === results.length) {
        throw new Error(failures[0].reason?.message || 'Unable to retrieve account information.');
      }
      if (failures.length > 0) {
        setMessage(`Account ${value} partially loaded. Some account information is temporarily unavailable.`);
      }
    } catch (e) {
      setError(e.message || 'Unable to load this customer account.');
      setUsage(null);
      setUsageHistory([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const list = await AuthApi.users();
      setUsers(list || []);
    } catch (e) {
      if (isAdmin) setError(e.message || 'Unable to retrieve user directory.');
    }
  };

  useEffect(() => {
    loadUsers();
    loadAccount('NWSDB-0001');
    runHealthCheck();
  }, [isAdmin]);

  const recordReading = async (e) => {
    e.preventDefault();
    if (!reading || !selectedAccount) return;
    setError('');
    setMessage('');
    try {
      const res = await UsageApi.record(selectedAccount, reading);
      setReading('');
      setMessage(`Meter reading ${res.cubicMetres} m³ recorded successfully.`);
      await loadAccount(selectedAccount);
    } catch (e) {
      setError(e.message || 'Unable to save the meter reading.');
    }
  };

  const updatePaymentStatus = async (id, status) => {
    setError('');
    setMessage('');
    try {
      await PaymentApi.updateStatus(id, status);
      setMessage(`Payment #${id} has been updated to ${status}.`);
      await loadAccount(selectedAccount);
    } catch (e) {
      setError(e.message || 'Unable to update the payment.');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await AuthApi.createUser(newUser);
      setNewUser({ fullName: '', email: '', password: '', role: 'Staff', accountNumber: '' });
      setMessage(`User account ${newUser.email} created successfully.`);
      await loadUsers();
    } catch (e) {
      setError(e.message || 'Unable to create the user account.');
    }
  };

  const pendingPayments = payments.filter((p) => p.status === 'Pending').length;
  const completedPayments = payments.filter((p) => p.status === 'Completed').length;
  const avgUsage = useMemo(() => {
    if (!usageHistory.length) return '0.0';
    const sum = usageHistory.reduce((acc, r) => acc + Number(r.cubicMetres || 0), 0);
    return (sum / usageHistory.length).toFixed(1);
  }, [usageHistory]);

  const customerAccounts = useMemo(() => {
    const list = users.filter((u) => u.accountNumber).map((u) => ({
      accountNumber: u.accountNumber,
      name: u.fullName,
      email: u.email
    }));
    if (!list.some((c) => c.accountNumber === 'NWSDB-0001')) {
      list.unshift({ accountNumber: 'NWSDB-0001', name: 'Primary Demo Customer', email: 'customer@nwsdb.local' });
    }
    return list;
  }, [users]);

  const nav = [
    ['dashboard', 'Overview', 'grid'],
    ['customers', 'Customer Accounts', 'users'],
    ['usage', 'Usage & Metering', 'water'],
    ['payments', 'Payments', 'card'],
    ['readings', 'Meter Readings', 'meter'],
    ...(isAdmin ? [['users', 'User Management', 'shield']] : []),
    ['settings', 'Service Status', 'settings']
  ];

  const title = {
    dashboard: 'Service Overview',
    customers: 'Customer Accounts',
    usage: 'Water Usage & Billing',
    payments: 'Payments & Approvals',
    readings: 'Meter Readings',
    users: 'User Management',
    settings: 'Service Status'
  }[active];

  const subtitle = {
    dashboard: 'A clear view of customer activity, water consumption, payments, and the services supporting daily operations.',
    customers: 'Search customer accounts, review usage history, and inspect account activity.',
    usage: 'Review meter readings, consumption history, and calculated billing information.',
    payments: 'Review payment records, clear pending transactions, and inspect payment channels.',
    readings: 'Record meter readings with clear previous-value and consumption checks.',
    users: 'Create and review system accounts with role-based access.',
    settings: 'Check the availability of the services supporting customer accounts, payments, and water usage.'
  }[active];

  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 2.8C12 2.8 5.5 10.1 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8Z" /></svg>
          </div>
          <div>
            <strong>NWSDB</strong>
            <span>SOC Operations</span>
          </div>
          <span className="ops-version">SOC v1</span>
        </div>

        <div className="ops-nav-label">Operations Console</div>
        <nav>
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={active === id ? 'active' : ''}
              onClick={() => setActive(id)}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="ops-sidebar-bottom">
          <div className="ops-role">
            <StatusPill status={user.role} />
            <span>Authenticated</span>
          </div>
          <button type="button" className="ops-signout" onClick={onLogout}>
            <Icon name="logout" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="ops-main">
        <header className="ops-header">
          <div className="ops-breadcrumb">
            NWSDB Customer Services / <strong>{title}</strong>
          </div>
          <div className="ops-header-user">
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
            <div className="ops-avatar">
              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <section className="ops-content">
          <div className="ops-page-heading">
            <div>
              <p className="eyebrow">National Water Supply & Drainage Board</p>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="ops-page-actions">
              <div className="ops-live-status">
                <span className="live-dot" />
                {healthLabel}
              </div>
              {lastUpdated && (
                <span className="ops-updated">
                  Synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="success-banner" role="status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/></svg>
              <span>{message}</span>
            </div>
          )}

          {active === 'dashboard' && (
            <>
              <div className="ops-kpi-grid">
                <div className="ops-kpi">
                  <div className="ops-kpi-top">
                    <span>Total Payments</span>
                    <span className="kpi-icon">↗</span>
                  </div>
                  <strong>{payments.length}</strong>
                  <small><b>{completedPayments}</b> completed · {pendingPayments} pending</small>
                </div>

                <div className="ops-kpi">
                  <div className="ops-kpi-top">
                    <span>Pending Approvals</span>
                    <span className="kpi-icon kpi-warning">!</span>
                  </div>
                  <strong style={{ color: pendingPayments > 0 ? 'var(--amber-700)' : 'var(--navy-950)' }}>
                    {pendingPayments}
                  </strong>
                  <small>{pendingPayments > 0 ? 'Requires staff clearance' : 'All transactions cleared'}</small>
                </div>

                <div className="ops-kpi">
                  <div className="ops-kpi-top">
                    <span>Meter Readings</span>
                    <span className="kpi-icon">≈</span>
                  </div>
                  <strong>{usageHistory.length}</strong>
                  <small>Recent readings for {selectedAccount}</small>
                </div>

                <div className="ops-kpi">
                  <div className="ops-kpi-top">
                    <span>Estimated Due</span>
                    <span className="kpi-icon">Rs</span>
                  </div>
                  <strong style={{ color: 'var(--blue-600)' }}>
                    {usage ? `Rs. ${Number(usage.estimatedBill).toFixed(2)}` : '—'}
                  </strong>
                  <small>{usage ? `${usage.unitsConsumed} m³ consumed` : 'Load an account'}</small>
                </div>
              </div>

              <div className="ops-dashboard-grid">
                <section className="ops-panel">
                  <div className="ops-panel-title">
                    <div>
                      <span className="card-kicker">Water Consumption</span>
                      <h2>Account Usage Trend</h2>
                    </div>
                    <div className="ops-panel-meta">
                      <span className="ops-caption">{selectedAccount || 'NWSDB-0001'}</span>
                      <span className="ops-period">Recent 7 Readings</span>
                    </div>
                  </div>

                  {usage ? (
                    <div className="ops-overview">
                      <div className="ops-big-number">
                        <span>Latest Meter Reading</span>
                        <strong>{usage.currentCubicMetres} <em>m³</em></strong>
                        <small>Period consumption: {usage.unitsConsumed} m³</small>
                      </div>
                      <div className="ops-bars">
                        {usageHistory.slice(0, 7).reverse().map((r, i) => {
                          const val = Number(r.cubicMetres || 0);
                          const maxVal = Math.max(1, Number(usage.currentCubicMetres || 1));
                          const heightPct = Math.max(14, Math.min(100, Math.round((val / maxVal) * 100)));
                          return (
                            <div className="ops-bar-item" key={r.id || i}>
                              <div className="ops-bar" style={{ height: `${heightPct}%` }} title={`${val} m³ on ${new Date(r.readingDateUtc).toLocaleDateString()}`} />
                              <span>{i + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="ops-empty">
                      Select a customer account to view recent water usage and payment activity.
                    </div>
                  )}
                </section>

                <section className="ops-panel">
                  <div className="ops-panel-title">
                    <div>
                      <span className="card-kicker">Account Lookup</span>
                      <h2>Quick Switch</h2>
                    </div>
                    <Icon name="search" />
                  </div>

                  <form className="ops-lookup" onSubmit={(e) => { e.preventDefault(); loadAccount(); }}>
                    <div className="ops-input-wrap">
                      <Icon name="search" />
                      <input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. NWSDB-0001"
                      />
                    </div>
                    <button type="submit" disabled={loading} className="btn-blue" style={{ width: '100%', marginTop: '6px' }}>
                      {loading ? 'Retrieving account…' : 'View Account'}
                    </button>
                  </form>

                  {customerAccounts.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <span className="card-kicker">Customer Accounts</span>
                      <div className="customer-quick-picker">
                        {customerAccounts.slice(0, 5).map((c) => (
                          <button
                            key={c.accountNumber}
                            type="button"
                            className={`customer-quick-chip ${selectedAccount === c.accountNumber ? 'active' : ''}`}
                            onClick={() => {
                              setAccountNumber(c.accountNumber);
                              loadAccount(c.accountNumber);
                            }}
                          >
                            {c.accountNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {usage && (
                    <div className="ops-mini-grid">
                      <div>
                        <span>Average Reading</span>
                        <strong>{avgUsage} m³</strong>
                      </div>
                      <div>
                        <span>Recorded Payments</span>
                        <strong>{payments.length}</strong>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <section className="ops-panel ops-table-panel">
                <div className="ops-panel-title">
                  <div>
                    <span className="card-kicker">Payment Activity</span>
                    <h2>Recent Payments for {selectedAccount}</h2>
                  </div>
                  <button type="button" className="btn-secondary" style={{ padding: '5px 12px', fontSize: '11px' }} onClick={() => setActive('payments')}>
                    View All Payments →
                  </button>
                </div>
                <PaymentTable payments={payments.slice(0, 5)} onComplete={updatePaymentStatus} />
              </section>

              <section className="ops-panel ops-service-summary">
                <div className="ops-panel-title">
                  <div>
                    <span className="card-kicker">Service Status</span>
                    <h2>Customer Service Availability</h2>
                  </div>
                  <button type="button" className="btn-secondary" onClick={runHealthCheck} disabled={healthLoading}>
                    {healthLoading ? 'Checking…' : 'Refresh Status'}
                  </button>
                </div>
                <div className="ops-service-summary-grid">
                  {healthStatus.map((service) => (
                    <div className="ops-service-summary-card" key={service.name}>
                      <div className="ops-service-summary-icon">
                        <Icon name={service.name.includes('Usage') ? 'water' : service.name.includes('Payment') ? 'card' : 'shield'} />
                      </div>
                      <div>
                        <strong>{service.name}</strong>
                        <span>{service.ok ? 'Service is available and responding normally.' : 'Service is currently unavailable.'}</span>
                      </div>
                      <StatusPill status={service.ok ? 'Available' : 'Unavailable'} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {active === 'customers' && (
            <AccountWorkspace
              accountNumber={accountNumber}
              setAccountNumber={setAccountNumber}
              loadAccount={loadAccount}
              loading={loading}
              usage={usage}
              payments={payments}
              usageHistory={usageHistory}
              selectedAccount={selectedAccount}
              customerAccounts={customerAccounts}
            />
          )}

          {active === 'usage' && (
            <UsageWorkspace
              usage={usage}
              usageHistory={usageHistory}
              selectedAccount={selectedAccount}
              accountNumber={accountNumber}
              setAccountNumber={setAccountNumber}
              loadAccount={loadAccount}
              loading={loading}
            />
          )}

          {active === 'payments' && (
            <PaymentWorkspace
              payments={payments}
              selectedAccount={selectedAccount}
              onComplete={updatePaymentStatus}
              loadAccount={loadAccount}
            />
          )}

          {active === 'readings' && (
            <ReadingWorkspace
              usageHistory={usageHistory}
              selectedAccount={selectedAccount}
              reading={reading}
              setReading={setReading}
              recordReading={recordReading}
              latestUsage={usage}
            />
          )}

          {active === 'users' && isAdmin && (
            <UserWorkspace
              users={users}
              newUser={newUser}
              setNewUser={setNewUser}
              createUser={createUser}
            />
          )}

          {active === 'settings' && (
            <SystemWorkspace
              isAdmin={isAdmin}
              user={user}
              healthStatus={healthStatus}
              healthLoading={healthLoading}
              onRefreshHealth={runHealthCheck}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function AccountWorkspace({
  accountNumber,
  setAccountNumber,
  loadAccount,
  loading,
  usage,
  payments,
  usageHistory,
  selectedAccount,
  customerAccounts
}) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section className="ops-panel">
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Customer Accounts</span>
            <h2>Select or Search Account</h2>
          </div>
        </div>

        <form className="ops-search" onSubmit={(e) => { e.preventDefault(); loadAccount(); }} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'end' }}>
          <label style={{ margin: 0 }}>
            Account Number
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. NWSDB-0001"
              required
            />
          </label>
          <button type="submit" disabled={loading} className="btn-blue">
            {loading ? 'Searching…' : 'Inspect Account'}
          </button>
        </form>

        <div style={{ marginTop: '16px' }}>
          <span className="card-kicker">Registered Customer Accounts</span>
          <div className="customer-quick-picker">
            {customerAccounts.map((c) => (
              <button
                key={c.accountNumber}
                type="button"
                className={`customer-quick-chip ${selectedAccount === c.accountNumber ? 'active' : ''}`}
                onClick={() => {
                  setAccountNumber(c.accountNumber);
                  loadAccount(c.accountNumber);
                }}
              >
                <strong>{c.accountNumber}</strong> ({c.name})
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedAccount && (
        <>
          <div className="ops-kpi-grid">
            <div className="ops-kpi">
              <div className="ops-kpi-top"><span>Current Consumption</span></div>
              <strong>{usage ? `${usage.unitsConsumed} m³` : '—'}</strong>
              <small>Units this period</small>
            </div>
            <div className="ops-kpi">
              <div className="ops-kpi-top"><span>Current Bill</span></div>
              <strong style={{ color: 'var(--blue-600)' }}>
                {usage ? `Rs. ${Number(usage.estimatedBill).toFixed(2)}` : '—'}
              </strong>
              <small>Domestic tariff calculated</small>
            </div>
            <div className="ops-kpi">
              <div className="ops-kpi-top"><span>Settled Payments</span></div>
              <strong>{payments.filter((p) => p.status === 'Completed').length}</strong>
              <small>Cleared transactions</small>
            </div>
            <div className="ops-kpi">
              <div className="ops-kpi-top"><span>Reading Count</span></div>
              <strong>{usageHistory.length}</strong>
              <small>Recorded readings</small>
            </div>
          </div>

          <section className="ops-panel">
            <div className="ops-panel-title">
              <h2>Account Diagnostic Summary</h2>
              <span className="ops-caption">{selectedAccount}</span>
            </div>
            {usage ? (
              <div className="ops-detail-list">
                <div><span>Current Meter Reading</span><strong>{usage.currentCubicMetres} m³</strong></div>
                <div><span>Previous Meter Reading</span><strong>{usage.previousCubicMetres} m³</strong></div>
                <div><span>Net Volumetric Consumption</span><strong>{usage.unitsConsumed} m³</strong></div>
                <div><span>Last Recorded Date</span><strong>{new Date(usage.readingDateUtc).toLocaleString()}</strong></div>
                <div><span>Calculated Outstanding Bill</span><strong>Rs. {Number(usage.estimatedBill).toFixed(2)}</strong></div>
                <div><span>Account Supply Status</span><strong>Active Standard Connection</strong></div>
              </div>
            ) : (
              <div className="ops-empty">No telemetry records exist for this account yet.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function UsageWorkspace({ usage, usageHistory, selectedAccount, accountNumber, setAccountNumber, loadAccount, loading }) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section className="ops-panel">
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Water Consumption</span>
            <h2>Consumption Analysis for {selectedAccount}</h2>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); loadAccount(); }} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'end' }}>
          <label style={{ margin: 0 }}>
            Account Number
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </label>
          <button type="submit" disabled={loading} className="btn-blue">
            {loading ? 'Querying…' : 'Load Usage'}
          </button>
        </form>
      </section>

      {usage && (
        <section className="ops-panel">
          <div className="ops-panel-title">
            <h2>Usage & Billing Analysis</h2>
            <StatusPill status="Verified" />
          </div>
          <div className="ops-detail-list">
            <div><span>Current Index</span><strong>{usage.currentCubicMetres} m³</strong></div>
            <div><span>Previous Index</span><strong>{usage.previousCubicMetres} m³</strong></div>
            <div><span>Volume Consumed</span><strong>{usage.unitsConsumed} m³</strong></div>
            <div><span>Estimated Bill</span><strong>Rs. {Number(usage.estimatedBill).toFixed(2)}</strong></div>
          </div>
        </section>
      )}

      <section className="ops-panel">
        <div className="ops-panel-title">
          <h2>Meter Reading Log</h2>
          <span className="muted">{usageHistory.length} total readings</span>
        </div>
        <MeterTable rows={usageHistory} />
      </section>
    </div>
  );
}

function PaymentWorkspace({ payments, selectedAccount, onComplete, loadAccount }) {
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchesFilter = filter === 'ALL' || p.status === filter;
      const matchesQuery = !query ||
        p.referenceNumber?.toLowerCase().includes(query.toLowerCase()) ||
        p.channel?.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [payments, filter, query]);

  return (
    <section className="ops-panel">
      <div className="ops-panel-title">
        <div>
          <span className="card-kicker">Customer Payments</span>
          <h2>Payment Records & Clearance for {selectedAccount}</h2>
        </div>
        <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => loadAccount(selectedAccount)}>
          Refresh Records
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', margin: '14px 0', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'Pending', 'Completed', 'Failed'].map((status) => (
            <button
              key={status}
              type="button"
              className={`preset-chip ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Filter reference or channel…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '240px', margin: 0, padding: '7px 12px' }}
        />
      </div>

      <PaymentTable payments={filtered} onComplete={onComplete} />
    </section>
  );
}

function ReadingWorkspace({ usageHistory, selectedAccount, reading, setReading, recordReading, latestUsage }) {
  const prevReading = latestUsage?.currentCubicMetres ?? 0;
  const numReading = Number(reading || 0);
  const delta = reading ? (numReading - prevReading).toFixed(2) : null;
  const isBackwards = reading && numReading < prevReading;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section className="ops-panel">
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Meter Reading</span>
            <h2>Record Meter Reading</h2>
          </div>
          <StatusPill status="Authorized Staff" />
        </div>

        {selectedAccount ? (
          <form onSubmit={recordReading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
              <label>
                Target Account
                <input value={selectedAccount} readOnly />
              </label>

              <label>
                Previous Reading (m³)
                <input value={`${prevReading} m³`} readOnly />
              </label>

              <label>
                New Meter Reading (m³)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  placeholder={`Greater than ${prevReading}`}
                  required
                />
              </label>
            </div>

            {reading && (
              <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: isBackwards ? 'var(--ruby-50)' : 'var(--blue-50)', border: `1px solid ${isBackwards ? 'var(--ruby-100)' : 'var(--blue-100)'}` }}>
                {isBackwards ? (
                  <span style={{ color: 'var(--ruby-700)', fontWeight: 700, fontSize: '12px' }}>
                    Warning: Reading {numReading} m³ is less than previous index {prevReading} m³. Meter dial turnover requires verification.
                  </span>
                ) : (
                  <span style={{ color: 'var(--navy-800)', fontWeight: 700, fontSize: '12px' }}>
                    Calculated consumption difference: +{delta} m³
                  </span>
                )}
              </div>
            )}

            <button type="submit" className="btn-blue" disabled={!reading}>
              Save Meter Reading
            </button>
          </form>
        ) : (
          <div className="ops-empty">
            Select an account from the Customer Workspace first.
          </div>
        )}
      </section>

      <section className="ops-panel">
        <div className="ops-panel-title">
          <h2>Reading History for {selectedAccount}</h2>
          <span className="muted">{usageHistory.length} recorded readings</span>
        </div>
        <MeterTable rows={usageHistory} />
      </section>
    </div>
  );
}

function UserWorkspace({ users, newUser, setNewUser, createUser }) {
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => roleFilter === 'ALL' || u.role === roleFilter);
  }, [users, roleFilter]);

  return (
    <div className="ops-dashboard-grid">
      <form className="ops-panel" onSubmit={createUser}>
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Role-Based Access Control</span>
            <h2>Provision User Account</h2>
          </div>
          <StatusPill status="Admin Only" />
        </div>

        <label>
          Full Name
          <input
            value={newUser.fullName}
            onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            placeholder="Official full name"
            required
          />
        </label>

        <label>
          Email Address
          <input
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="user@nwsdb.local"
            required
          />
        </label>

        <label>
          Temporary Password
          <input
            type="password"
            minLength="6"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Min 6 characters"
            required
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label>
            Security Role
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="Staff">Staff</option>
              <option value="Customer">Customer</option>
              <option value="Admin">Admin</option>
              <option value="Partner">Partner</option>
            </select>
          </label>

          <label>
            Assigned Account #
            <input
              value={newUser.accountNumber}
              onChange={(e) => setNewUser({ ...newUser, accountNumber: e.target.value })}
              placeholder="e.g. NWSDB-0002"
            />
          </label>
        </div>

        <button type="submit" className="btn-blue" style={{ width: '100%', marginTop: '8px' }}>
          Provision User Account
        </button>
      </form>

      <section className="ops-panel">
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Directory</span>
            <h2>Active System Users</h2>
          </div>
          <span className="muted">{filteredUsers.length} accounts</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {['ALL', 'Admin', 'Staff', 'Customer', 'Partner'].map((r) => (
            <button
              key={r}
              type="button"
              className={`preset-chip ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Account #</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.fullName}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>{u.email}</div>
                  </td>
                  <td><StatusPill status={u.role} /></td>
                  <td>{u.accountNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SystemWorkspace({ isAdmin, user, healthStatus, healthLoading, onRefreshHealth }) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section className="ops-panel">
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Service Availability</span>
            <h2>Service Availability</h2>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onRefreshHealth}
            disabled={healthLoading}
            style={{ fontSize: '11px', padding: '5px 12px' }}
          >
            {healthLoading ? 'Checking services…' : 'Check Service Status'}
          </button>
        </div>

        <div className="service-health-grid">
          {healthStatus.length > 0 ? (
            healthStatus.map((s) => (
              <div className="service-health-card" key={s.name}>
                <div className={`service-dot ${s.ok ? '' : 'dot-offline'}`} />
                <div className="service-info">
                  <strong>{s.name}</strong>
                  <span>{s.ok ? 'Available' : 'Currently unavailable'}</span>
                </div>
                <div className="service-latency">
                  {s.latency} ms response
                </div>
                <div>
                  <StatusPill status={s.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="ops-empty">
              Checking service availability…
            </div>
          )}
        </div>
      </section>

      <section className="ops-panel">
        <div className="ops-panel-title">
          <div>
            <span className="card-kicker">Account Access</span>
            <h2>Signed-in Account</h2>
          </div>
          <StatusPill status="Signed In" />
        </div>
        <div className="ops-detail-list">
          <div><span>Account</span><strong>{user.fullName} ({user.email})</strong></div>
          <div><span>Role</span><strong>{user.role}</strong></div>
          <div><span>Access Level</span><strong>{isAdmin ? 'Administrator' : 'Staff Operator'}</strong></div>
          <div><span>Access Permissions</span><strong>{isAdmin ? 'Granted (Full Access)' : 'Standard Staff Operations'}</strong></div>
          <div><span>Service Access</span><strong>Customer, payment and water-service operations</strong></div>
          <div><span>Session Status</span><strong>Secure and active</strong></div>
        </div>
      </section>
    </div>
  );
}

function PaymentTable({ payments, onComplete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference Number</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {payments.length ? (
            payments.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.referenceNumber}</strong></td>
                <td>{p.accountNumber}</td>
                <td>Rs. {Number(p.amount).toFixed(2)}</td>
                <td>{p.channel}</td>
                <td><StatusPill status={p.status} /></td>
                <td>
                  {p.status === 'Pending' ? (
                    <button
                      className="table-button"
                      type="button"
                      onClick={() => onComplete(p.id, 'Completed')}
                    >
                      Approve Payment
                    </button>
                  ) : (
                    <span className="muted" style={{ fontSize: '11px' }}>Processed</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="empty-cell">
                No payment transactions recorded for this account.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MeterTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Meter Reading</th>
            <th>Timestamp (UTC)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.cubicMetres} m³</strong></td>
                <td>{new Date(r.readingDateUtc).toLocaleString()}</td>
                <td><span className="status-pill status-completed">Recorded</span></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="empty-cell">
                No physical or automated readings logged.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
