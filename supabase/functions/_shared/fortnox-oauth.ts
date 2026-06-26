const AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
const TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

export type FortnoxTokenResponse = {
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
};

export function randomOAuthState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function stateHash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fortnoxAuthorizationUrl(state: string) {
  const clientId = Deno.env.get('FORTNOX_CLIENT_ID');
  const redirectUri = Deno.env.get('FORTNOX_REDIRECT_URI');
  if (!clientId || !redirectUri) throw new Error('Fortnox OAuth-konfiguration saknas');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: Deno.env.get('FORTNOX_SCOPES') ?? 'companyinformation customer invoice article',
    state,
    access_type: 'offline',
    response_type: 'code',
    account_type: 'service',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(params: URLSearchParams) {
  const clientId = Deno.env.get('FORTNOX_CLIENT_ID');
  const clientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Fortnox klientuppgifter saknas');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Fortnox tokenfel ${response.status}: ${JSON.stringify(payload)}`);
  return payload as FortnoxTokenResponse;
}

export function exchangeFortnoxCode(code: string) {
  const redirectUri = Deno.env.get('FORTNOX_REDIRECT_URI');
  if (!redirectUri) throw new Error('FORTNOX_REDIRECT_URI saknas');
  return tokenRequest(new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }));
}

export function refreshFortnoxToken(refreshToken: string) {
  return tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }));
}
