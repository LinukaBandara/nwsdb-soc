// Base URLs for the two independently-deployable services. In production
// these would point at a single API Gateway; kept separate here to make the
// service-oriented nature of the system explicit for demo/marking purposes.
const PAYMENT_API = import.meta.env.VITE_PAYMENT_API ?? 'https://localhost:5001/api/v1';
const USAGE_API = import.meta.env.VITE_USAGE_API ?? 'https://localhost:5011/api/v1';

async function handle(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.status === 204 ? null : response.json();
}

export const PaymentApi = {
  create: (accountNumber, amount, channel) =>
    fetch(`${PAYMENT_API}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, amount, channel })
    }).then(handle),

  historyForAccount: (accountNumber) =>
    fetch(`${PAYMENT_API}/payments/account/${accountNumber}`).then(handle)
};

export const UsageApi = {
  latest: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${accountNumber}/latest`).then(handle),

  history: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${accountNumber}/history`).then(handle)
};
