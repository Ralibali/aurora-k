import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fortnoxApi } from '../_shared/fortnox-api.ts';
import { exchangeFortnoxCode, stateHash } from '../_shared/fortnox-oauth.ts';

function redirect(path: string, success: boolean, message?: string) {
  const appUrl = Deno.env.get('APP_URL') ?? 'https://auroratransport.se';
  const url = new URL(path, appUrl);
  url.searchParams.set('fortnox', success ? 'connected' : 'error');
  if (message) url.searchParams.set('message', message.slice(0, 180));
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async request => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const oauthError = requestUrl.searchParams.get('error');
  if (!code || !state || oauthError) return redirect('/admin/settings', false, oauthError ?? 'Saknad kod eller state');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return redirect('/admin/settings', false, 'Serverkonfiguration saknas');
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const hash = await stateHash(state);
    const { data: oauthState, error: stateError } = await admin
      .from('fortnox_oauth_states')
      .select('*')
      .eq('state_hash', hash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (stateError || !oauthState) throw new Error('OAuth-sessionen är ogiltig eller har gått ut');

    const tokens = await exchangeFortnoxCode(code);
    const expiresAt = new Date(Date.now() + Math.max(60, Number(tokens.expires_in)) * 1000).toISOString();
    const scopes = String(tokens.scope ?? '').split(/\s+/).filter(Boolean);
    const { error: tokenError } = await admin.rpc('store_fortnox_tokens', {
      p_company_id: oauthState.company_id,
      p_user_id: oauthState.user_id,
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token,
      p_expires_at: expiresAt,
      p_scopes: scopes,
    });
    if (tokenError) throw tokenError;

    const companyPayload = await fortnoxApi('/companyinformation', tokens.access_token);
    const company = (companyPayload.CompanyInformation ?? {}) as Record<string, unknown>;
    await admin.from('fortnox_connections').update({
      fortnox_company_name: company.CompanyName ? String(company.CompanyName) : null,
      fortnox_organization_number: company.OrganizationNumber ? String(company.OrganizationNumber) : null,
      updated_at: new Date().toISOString(),
    }).eq('company_id', oauthState.company_id);
    await admin.from('fortnox_oauth_states').update({ used_at: new Date().toISOString() }).eq('id', oauthState.id);
    return redirect(oauthState.redirect_after, true);
  } catch (error) {
    console.error('[fortnox-oauth-callback]', error);
    return redirect('/admin/settings', false, error instanceof Error ? error.message : 'Fortnox kunde inte anslutas');
  }
});
