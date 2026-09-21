import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { sendResendMail } from '../_shared/resend.ts';
import { handleShareAssignment, type SharedAssignment } from './handler.ts';

Deno.serve(req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  return handleShareAssignment(req, {
    user: async token => { const { data, error } = await db.auth.getUser(token); return error ? null : data.user; },
    companyId: async userId => {
      const { data, error } = await db.from('profiles').select('company_id').eq('id', userId).maybeSingle();
      if (error) throw error;
      return data?.company_id ?? null;
    },
    isAdmin: async (userId, companyId) => {
      const { data, error } = await db.from('user_roles').select('company_id').eq('user_id', userId).eq('company_id', companyId).eq('role', 'admin').maybeSingle();
      if (error) throw error;
      return data?.company_id === companyId;
    },
    company: async companyId => {
      const { data, error } = await db.from('companies').select('name,org_nr').eq('id', companyId).maybeSingle();
      if (error) throw error;
      return data;
    },
    assignment: async (id, companyId) => {
      const { data, error } = await db.from('assignments').select('id,company_id,title,status,scheduled_start,address,pickup_address,delivery_address,customer:customers(name,email)').eq('id', id).eq('company_id', companyId).maybeSingle();
      if (error) throw error;
      return data as SharedAssignment | null;
    },
    allowSend: async companyId => {
      const { data, error } = await db.rpc('consume_mail_rate_limit', { p_key: `assignment-mail/${companyId}`, p_limit: 100, p_window_seconds: 3600 });
      if (error) throw error;
      return data === true;
    },
    send: sendResendMail,
  });
});
