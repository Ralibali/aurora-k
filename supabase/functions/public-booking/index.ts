import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BookingSchema = z.object({
  slug: z.string().min(1).max(100),
  customer_name: z.string().min(2).max(160),
  customer_email: z.string().email().max(254),
  customer_phone: z.string().min(5).max(60),
  preferred_date: z.string().min(1).max(40),
  title: z.string().min(2).max(220),
  description: z.string().max(6000).optional(),
  attachment_paths: z.array(z.string().max(500)).max(10).default([]),
  order_number: z.string().min(3).max(40),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const parsed = BookingSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Ogiltiga bokningsuppgifter', details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name')
      .eq('public_booking_slug', parsed.data.slug)
      .limit(1)
      .maybeSingle();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Bokningssidan är inte kopplad till något företag' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: booking, error: bookingError } = await admin
      .from('booking_requests')
      .insert({
        company_id: company.id,
        customer_name: parsed.data.customer_name,
        customer_email: parsed.data.customer_email,
        customer_phone: parsed.data.customer_phone,
        preferred_date: parsed.data.preferred_date,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    await admin.from('notification_outbox').insert([
      {
        channel: 'email',
        type: 'booking_request_created',
        subject: `Ny transportförfrågan ${parsed.data.order_number}`,
        payload: {
          companyId: company.id,
          companyName: company.name,
          orderNumber: parsed.data.order_number,
          bookingId: booking.id,
          attachmentPaths: parsed.data.attachment_paths,
        },
        status: 'pending',
      },
      {
        channel: 'email',
        type: 'booking_request_customer_confirmation',
        recipient_email: parsed.data.customer_email,
        subject: `Vi har tagit emot din transportförfrågan ${parsed.data.order_number}`,
        payload: {
          companyId: company.id,
          companyName: company.name,
          orderNumber: parsed.data.order_number,
          bookingId: booking.id,
        },
        status: 'pending',
      },
    ]);

    return new Response(JSON.stringify({ booking, order_number: parsed.data.order_number }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Kunde inte skapa transportförfrågan';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
