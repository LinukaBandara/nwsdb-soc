const IDENTITY_API = import.meta.env.VITE_IDENTITY_API ?? 'http://localhost:5021/api/v1';
const PAYMENT_API = import.meta.env.VITE_PAYMENT_API ?? 'http://localhost:5000/api/v1';
const USAGE_API = import.meta.env.VITE_USAGE_API ?? 'http://localhost:5010/api/v1';

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

  me: () => fetch(`${IDENTITY_API}/auth/me`, authorizedOptions()).then(handle)
};

export const PaymentApi = {
  create: (accountNumber, amount, channel) =>
    fetch(`${PAYMENT_API}/payments`, authorizedOptions({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, amount, channel })
    })).then(handle),

  historyForAccount: (accountNumber) =>
    fetch(`${PAYMENT_API}/payments/account/${encodeURIComponent(accountNumber)}`, authorizedOptions()).then(handle)
};

export const UsageApi = {
  latest: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${encodeURIComponent(accountNumber)}/latest`, authorizedOptions()).then(handle),

  history: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${encodeURIComponent(accountNumber)}/history`, authorizedOptions()).then(handle)
};
