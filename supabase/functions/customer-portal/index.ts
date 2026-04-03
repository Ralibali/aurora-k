const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const QuerySchema = z.object({
  token: z.string().min(1),
});

const BookingSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  preferred_date: z.string().optional(),
});

async function validateToken(supabase: any, token: string) {
  const { data: tokenData, error: tokenError } = await supabase
    .from('customer_access_tokens')
    .select('*, customer:customers(*)')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData) return null;
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) return null;
  return tokenData;
}

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

    const tokenData = await validateToken(supabase, parsed.data.token);
    if (!tokenData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const customerId = tokenData.customer_id;
    const customer = tokenData.customer;

    // POST = create booking request
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const bookingParsed = BookingSchema.safeParse(body);
      if (!bookingParsed.success) {
        return new Response(JSON.stringify({ error: 'Ogiltiga uppgifter', details: bookingParsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: booking, error: bookingError } = await supabase
        .from('booking_requests')
        .insert({
          customer_id: customerId,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          title: bookingParsed.data.title,
          description: bookingParsed.data.description || null,
          preferred_date: bookingParsed.data.preferred_date || null,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) {
        return new Response(JSON.stringify({ error: 'Kunde inte skapa förfrågan' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ booking }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET = fetch portal data
    const [assignmentsRes, ordersRes, invoicesRes, bookingsRes] = await Promise.all([
      supabase.from('assignments').select('id, title, address, status, scheduled_start, scheduled_end, actual_start, actual_stop, priority').eq('customer_id', customerId).order('scheduled_start', { ascending: false }).limit(100),
      supabase.from('orders').select('id, order_number, title, description, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, invoice_number, invoice_date, due_date, total_inc_vat, status').eq('customer_id', customerId).order('invoice_date', { ascending: false }),
      supabase.from('booking_requests').select('id, title, description, preferred_date, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
    ]);

    return new Response(JSON.stringify({
      customer,
      assignments: assignmentsRes.data || [],
      orders: ordersRes.data || [],
      invoices: invoicesRes.data || [],
      bookings: bookingsRes.data || [],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
