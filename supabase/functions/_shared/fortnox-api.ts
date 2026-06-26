export const FORTNOX_API_URL = 'https://api.fortnox.se/3';

export async function fortnoxApi(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`${FORTNOX_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Fortnox API ${response.status}: ${JSON.stringify(payload)}`);
  return payload as Record<string, unknown>;
}
