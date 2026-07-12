import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const responseHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

const QuerySchema = z.object({ token: z.string().uuid() });
const BookingSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  preferred_date: z.string().trim().max(80).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

async function validateToken(supabase: any, token: string) {
  const { data, error } = await supabase
    .from('customer_access_tokens')
    .select('customer_id, company_id, expires_at, customer:customers(id, name, contact_person, email, phone, org_number, company_id)')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({ token: url.searchParams.get('token') });
    if (!parsed.success) return json({ error: 'Invalid token' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const tokenData = await validateToken(supabase, parsed.data.token);
    if (!tokenData) return json({ error: 'Invalid or expired token' }, 401);

    const customer = Array.isArray(tokenData.customer) ? tokenData.customer[0] : tokenData.customer;
    const customerId = tokenData.customer_id;
    const companyId = tokenData.company_id ?? customer?.company_id;
    if (!customerId || !companyId || !customer) return json({ error: 'Portal access is incomplete' }, 403);

    if (req.method === 'POST') {
      const bookingParsed = BookingSchema.safeParse(await req.json().catch(() => ({})));
      if (!bookingParsed.success) {
        return json({ error: 'Ogiltiga uppgifter', details: bookingParsed.error.flatten().fieldErrors }, 400);
      }

      const { data: booking, error } = await supabase.from('booking_requests').insert({
        company_id: companyId,
        customer_id: customerId,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        title: bookingParsed.data.title,
        description: bookingParsed.data.description || null,
        preferred_date: bookingParsed.data.preferred_date || null,
        status: 'pending',
      }).select('id, title, description, preferred_date, status, created_at').single();

      if (error) {
        console.error('[customer-portal] booking insert failed', error);
        return json({ error: 'Kunde inte skapa förfrågan' }, 500);
      }
      return json({ booking }, 201);
    }

    const companyFilter = (query: any) => query.eq('customer_id', customerId).eq('company_id', companyId);
    const [assignmentsRes, ordersRes, invoicesRes, bookingsRes, settingsRes] = await Promise.all([
      companyFilter(supabase
        .from('assignments')
        .select('id, title, address, pickup_address, delivery_address, service_type, status, scheduled_start, scheduled_end, actual_start, actual_stop, priority, tracking_token, consignment_photo_url, signature_url, require_photo, require_signature, driver:profiles!assignments_assigned_driver_id_fkey(full_name)'))
        .order('scheduled_start', { ascending: false })
        .limit(100),
      companyFilter(supabase
        .from('orders')
        .select('id, order_number, title, description, status, created_at'))
        .order('created_at', { ascending: false })
        .limit(100),
      companyFilter(supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, total_ex_vat, vat_amount, total_inc_vat, reference, message, assignment_ids, lines, status'))
        .order('invoice_date', { ascending: false })
        .limit(100),
      companyFilter(supabase
        .from('booking_requests')
        .select('id, title, description, preferred_date, status, created_at'))
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('settings')
        .select('company_name, org_number, address, zip_city, email, phone, bankgiro, plusgiro, vat_number')
        .eq('company_id', companyId)
        .maybeSingle(),
    ]);

    const failedQuery = [assignmentsRes, ordersRes, invoicesRes, bookingsRes, settingsRes].find(result => result.error);
    if (failedQuery?.error) {
      console.error('[customer-portal] data lookup failed', failedQuery.error);
      return json({ error: 'Kundportalen kunde inte laddas' }, 500);
    }

    return json({
      customer: {
        id: customer.id,
        name: customer.name,
        contact_person: customer.contact_person,
        email: customer.email,
        phone: customer.phone,
        org_number: customer.org_number,
      },
      settings: settingsRes.data,
      assignments: assignmentsRes.data || [],
      orders: ordersRes.data || [],
      invoices: (invoicesRes.data || []).map((invoice: Record<string, unknown>) => ({ ...invoice, customer })),
      bookings: bookingsRes.data || [],
    });
  } catch (error: unknown) {
    console.error('[customer-portal] unexpected error', error);
    return json({ error: 'Kundportalen kunde inte laddas' }, 500);
  }
});
