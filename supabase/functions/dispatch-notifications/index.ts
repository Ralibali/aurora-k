import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { corsHeaders } from '../_shared/cors.ts';
import { deliverOutbox } from '../_shared/notification-outbox.ts';

Deno.serve(async request => {
  const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  if (request.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if (request.method!=='POST') return reply({error:'Method not allowed'},405);
  try {
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,service,{auth:{persistSession:false}});
    const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
    let trusted=token===service;
    const cronSecret=request.headers.get('x-cron-secret');
    if (!trusted && cronSecret && cronSecret.length >= 32 && cronSecret.length <= 256) {
      // Vault owns the scheduler credential. The service-only RPC verifies it
      // without duplicating or exposing its value in Edge configuration.
      const {data:valid,error}=await admin.rpc('validate_notification_cron_secret',{p_secret:cronSecret});
      trusted=!error && valid===true;
    }
    let companyId: string | null=null;
    if (!trusted) {
      const {data:{user},error}=await admin.auth.getUser(token ?? '');
      if(error||!user) return reply({error:'Unauthorized'},401);
      const {data:role}=await admin.from('user_roles').select('company_id').eq('user_id',user.id).eq('role','admin').maybeSingle();
      if(!role?.company_id) return reply({error:'Admin access required'},403);
      companyId=role.company_id;
    }
    return reply(await deliverOutbox(admin,companyId));
  } catch(error) {console.error('[dispatch-notifications]',error);return reply({error:'Email delivery could not be processed'},500);}
});
