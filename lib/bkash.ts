const base = process.env.BKASH_BASE_URL;
let cachedToken: { token: string; expiresAt: number } | null = null;

function required(name: string, value?: string) {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function bkashFetch(path: string, body: unknown, token?: string) {
  const root = required('BKASH_BASE_URL', base);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'username': required('BKASH_USERNAME', process.env.BKASH_USERNAME),
    'password': required('BKASH_PASSWORD', process.env.BKASH_PASSWORD),
  };
  if (token) headers['Authorization'] = token;
  headers['X-APP-Key'] = required('BKASH_APP_KEY', process.env.BKASH_APP_KEY);
  const response = await fetch(`${root}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`bKash API HTTP ${response.status}`);
  return data as Record<string, any>;
}

export async function getBkashToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const data = await bkashFetch('/token/grant', {
    app_key: required('BKASH_APP_KEY', process.env.BKASH_APP_KEY),
    app_secret: required('BKASH_APP_SECRET', process.env.BKASH_APP_SECRET),
  });
  const token = data.id_token || data.idToken || data.token;
  if (!token) throw new Error('bKash did not return an access token; verify API version and response schema');
  cachedToken = { token, expiresAt: Date.now() + 45 * 60 * 1000 };
  return token;
}

export async function createBkashPayment(amount: string, invoice: string, callbackURL: string) {
  const token = await getBkashToken();
  const data = await bkashFetch('/create', {
    mode: '0011',
    payerReference: invoice,
    callbackURL,
    amount,
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: invoice,
  }, token);
  if (!data.paymentID || !data.bkashURL) throw new Error('bKash Create Payment failed; verify API version and payload schema');
  return { paymentID: String(data.paymentID), bkashURL: String(data.bkashURL), raw: data };
}

export async function executeBkashPayment(paymentID: string) {
  const token = await getBkashToken();
  return bkashFetch('/execute', { paymentID }, token);
}

export async function queryBkashPayment(paymentID: string) {
  const token = await getBkashToken();
  return bkashFetch('/payment/status', { paymentID }, token);
}
