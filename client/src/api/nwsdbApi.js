// Each client function calls the corresponding independent REST service.
const PAYMENT_API = import.meta.env.VITE_PAYMENT_API ?? 'https://localhost:5001/api/v1';
const USAGE_API = import.meta.env.VITE_USAGE_API ?? 'https://localhost:5011/api/v1';

async function handle(response) {
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${message}`);
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
    fetch(`${PAYMENT_API}/payments/account/${encodeURIComponent(accountNumber)}`).then(handle)
};

export const UsageApi = {
  latest: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${encodeURIComponent(accountNumber)}/latest`).then(handle),

  history: (accountNumber) =>
    fetch(`${USAGE_API}/usage/${encodeURIComponent(accountNumber)}/history`).then(handle)
};
