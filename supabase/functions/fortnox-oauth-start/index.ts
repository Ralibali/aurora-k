import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fortnoxAuthorizationUrl, randomOAuthState, stateHash } from '../_shared/fortnox-oauth.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply({ error: 'Server configuration missing' }, 500);

  const auth = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: role } = await admin.from('user_roles').select('company_id,role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role?.company_id) return reply({ error: 'Admin access required' }, 403);

  try {
    const requestBody = await request.json().catch(() => ({})) as { redirectAfter?: string };
    const redirectAfter = requestBody.redirectAfter?.startsWith('/') ? requestBody.redirectAfter : '/admin/settings';
    const state = randomOAuthState();
    const { error } = await admin.from('fortnox_oauth_states').insert({
      state_hash: await stateHash(state),
      company_id: role.company_id,
      user_id: user.id,
      redirect_after: redirectAfter,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw error;
    await admin.from('fortnox_oauth_states').delete().lt('expires_at', new Date().toISOString());
    return reply({ authorizationUrl: fortnoxAuthorizationUrl(state) });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Fortnox-anslutningen kunde inte startas' }, 500);
  }
});
