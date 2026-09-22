const localApi = (envName, localUrl) => {
  const configured = import.meta.env[envName];
  if (configured) return configured;
  if (import.meta.env.DEV) return localUrl;
  return `${window.location.origin}/api/v1`;
};

const IDENTITY_API = localApi('VITE_IDENTITY_API', 'https://identityservices-production.up.railway.app/api/v1');
const PAYMENT_API = localApi('VITE_PAYMENT_API', 'https://paymentservices-production.up.railway.app/api/v1');
const USAGE_API = localApi('VITE_USAGE_API', 'https://usageservices-production.up.railway.app/api/v1');

export const authToken = () => localStorage.getItem('nwsdb_token');

async function handle(response) {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message || body.title || message;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) message = text;
    }
    throw new Error(`API error ${response.status}: ${message}`);
  }
  return response.status === 204 ? null : response.json();
}

function authorizedOptions(options = {}) {
  const token = authToken();
  return {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };
}

export const AuthApi = {
  login: (email, password) =>
    fetch(`${IDENTITY_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(handle),

  register: (fullName, email, password, accountNumber) =>
    fetch(`${IDENTITY_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, accountNumber })
    }).then(handle),

  me: () => fetch(`${IDENTITY_API}/auth/me`, authorizedOptions()).then(handle),
  users: () => fetch(`${IDENTITY_API}/auth/users`, authorizedOptions()).then(handle),
  createUser: (payload) => fetch(`${IDENTITY_API}/auth/users`, authorizedOptions({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })).then(handle)
};

export const PaymentApi = {
  createPayHereCheckout: (accountNumber, amount) =>
    fetch(`${PAYMENT_API}/payments/payhere/checkout`, authorizedOptions({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, amount: Number(amount) })
    })).then(handle),

  create: (accountNumber, amount, channel) =>
    fetch(`${PAYMENT_API}/payments`, authorizedOptions({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, amount: Number(amount), channel })
    })).then(handle),

  historyForAccount: (accountNumber) =>
    fetch(`${PAYMENT_API}/payments/account/${encodeURIComponent(accountNumber)}`, authorizedOptions()).then(handle),

  updateStatus: (id, status) => {
    const payload = typeof status === 'string' ? { status } : status;
    return fetch(`${PAYMENT_API}/payments/${id}/status`, authorizedOptions({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })).then(handle);
  }
};

export const UsageApi = {
  latest: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${encodeURIComponent(accountNumber)}/latest`, authorizedOptions()).then(handle),

  history: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${encodeURIComponent(accountNumber)}/history`, authorizedOptions()).then(handle),

  record: (accountNumber, cubicMetres) =>
    fetch(`${USAGE_API}/usage/readings`, authorizedOptions({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, cubicMetres: Number(cubicMetres) })
    })).then(handle)
};

export const HealthApi = {
  checkService: async (name, healthUrl) => {
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({ status: 'healthy' }));
        return { name, baseUrl: healthUrl, status: 'Operational', latency: duration, data, ok: true };
      }
      return { name, baseUrl: healthUrl, status: `HTTP ${res.status}`, latency: duration, ok: false };
    } catch (e) {
      const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
      return { name, baseUrl: healthUrl, status: 'Offline', latency: duration, error: e.message, ok: false };
    }
  },
  checkAll: async () => {
    if (!import.meta.env.DEV && !import.meta.env.VITE_IDENTITY_API && !import.meta.env.VITE_PAYMENT_API && !import.meta.env.VITE_USAGE_API) {
      const root = window.location.origin;
      return Promise.all([
        HealthApi.checkService('Identity Service', root + '/health/identity'),
        HealthApi.checkService('Payment Service', root + '/health/payment'),
        HealthApi.checkService('Usage Service', root + '/health/usage')
      ]);
    }

    const identityRoot = IDENTITY_API.replace(/\/api\/v1\/?$/, '');
    const paymentRoot = PAYMENT_API.replace(/\/api\/v1\/?$/, '');
    const usageRoot = USAGE_API.replace(/\/api\/v1\/?$/, '');
    return Promise.all([
      HealthApi.checkService('Identity Service', identityRoot + '/health'),
      HealthApi.checkService('Payment Service', paymentRoot + '/health'),
      HealthApi.checkService('Usage Service', usageRoot + '/health')
    ]);
  }
};
