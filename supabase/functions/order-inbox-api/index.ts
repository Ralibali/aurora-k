import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply({ error: 'Server configuration missing' }, 500);

  const authClient = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: role } = await admin.from('user_roles').select('company_id,role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role?.company_id) return reply({ error: 'Admin access required' }, 403);

  const body = await request.json().catch(() => ({})) as { action?: string; id?: string };
  if (body.action === 'activate') {
    const { data, error } = await admin.from('order_inbox_channels').upsert({ company_id: role.company_id }, { onConflict: 'company_id' }).select('id,inbox_key,enabled').single();
    if (error) return reply({ error: error.message }, 400);
    return reply({ channel: data });
  }

  if (body.action === 'mark' && body.id) {
    const { error } = await admin.from('inbound_order_emails').update({ reviewed_at: new Date().toISOString(), status: 'needs_review' }).eq('id', body.id).eq('company_id', role.company_id);
    if (error) return reply({ error: error.message }, 400);
    return reply({ updated: true });
  }

  const [channelResult, queueResult] = await Promise.all([
    admin.from('order_inbox_channels').select('id,inbox_key,enabled').eq('company_id', role.company_id).maybeSingle(),
    admin.from('inbound_order_emails').select('id,from_address,subject,status,parse_confidence,received_at,parsed_payload,attachments,error_message').eq('company_id', role.company_id).order('received_at', { ascending: false }).limit(30),
  ]);
  if (channelResult.error || queueResult.error) return reply({ error: channelResult.error?.message ?? queueResult.error?.message }, 400);
  return reply({ channel: channelResult.data, queue: queueResult.data ?? [] });
});
