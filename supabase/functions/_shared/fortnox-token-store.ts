import { refreshFortnoxToken } from './fortnox-oauth.ts';

export async function getValidFortnoxToken(admin: any, companyId: string, userId: string) {
  const { data, error } = await admin.rpc('read_fortnox_tokens', { p_company_id: companyId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.status !== 'connected') throw new Error('Fortnox är inte anslutet');

  const expiresAt = new Date(row.token_expires_at).getTime();
  if (expiresAt > Date.now() + 5 * 60_000) return String(row.access_token);

  const refreshed = await refreshFortnoxToken(String(row.refresh_token));
  const nextExpiry = new Date(Date.now() + Math.max(60, Number(refreshed.expires_in)) * 1000).toISOString();
  const scopes = String(refreshed.scope ?? '').split(/\s+/).filter(Boolean);
  const { error: storeError } = await admin.rpc('store_fortnox_tokens', {
    p_company_id: companyId,
    p_user_id: userId,
    p_access_token: refreshed.access_token,
    p_refresh_token: refreshed.refresh_token,
    p_expires_at: nextExpiry,
    p_scopes: scopes,
  });
  if (storeError) throw storeError;
  return refreshed.access_token;
}
