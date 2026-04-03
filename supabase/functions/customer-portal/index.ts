const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const QuerySchema = z.object({
  token: z.string().min(1),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const parsed = QuerySchema.safeParse({ token });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('customer_access_tokens')
      .select('*, customer:customers(*)')
      .eq('token', parsed.data.token)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const customerId = tokenData.customer_id;

    // Fetch assignments for this customer
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, address, status, scheduled_start, scheduled_end, actual_start, actual_stop, priority')
      .eq('customer_id', customerId)
      .order('scheduled_start', { ascending: false })
      .limit(100);

    // Fetch orders for this customer
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, title, description, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    // Fetch invoices for this customer
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, total_inc_vat, status')
      .eq('customer_id', customerId)
      .order('invoice_date', { ascending: false });

    return new Response(JSON.stringify({
      customer: tokenData.customer,
      assignments: assignments || [],
      orders: orders || [],
      invoices: invoices || [],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
