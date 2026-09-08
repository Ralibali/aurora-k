import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import { handleAuthEmail } from './handler.ts';
import { getSiteUrl } from '../_shared/site-url.ts';
import { resendConfig, resendRequest, sendResendMail } from '../_shared/resend.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Missing configuration');
    const mailConfig = resendConfig();
    resendRequest('/emails', {}, mailConfig); // Fail uniformly before any account lookup.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    return await handleAuthEmail(request, {
      siteUrl: getSiteUrl(), authUrl: url,
      async rateLimit(key, limit, seconds) {
        const { data, error } = await admin.rpc('consume_mail_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: seconds });
        if (error) throw new Error('Rate limit unavailable');
        return data === true;
      },
      async findUser(email) {
        const { data, error } = await admin.rpc('find_auth_user_for_mail', { p_email: email }).maybeSingle();
        if (error) throw new Error('Account lookup unavailable');
        if (data === null) return null;
        if (!data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string' || !('email_confirmed_at' in data)) throw new Error('Invalid account lookup');
        const confirmedAt = data.email_confirmed_at;
        if (confirmedAt !== null && typeof confirmedAt !== 'string') throw new Error('Invalid confirmation state');
        return { id: data.id, email_confirmed_at: confirmedAt };
      },
      createUser: input => admin.auth.admin.createUser(input),
      generateLink: input => admin.auth.admin.generateLink(input),
      sendMail: (mail, key) => sendResendMail(mail, key, mailConfig),
      reportFailure: stage => console.warn(`auth-email: ${stage}`),
    });
  } catch {
    console.error('auth-email: configuration-unavailable');
    return new Response(JSON.stringify({ error: 'Mejltjänsten är tillfälligt otillgänglig. Försök igen senare.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
});
