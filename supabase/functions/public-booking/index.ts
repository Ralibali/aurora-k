import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { z } from 'https://esm.sh/zod@3';
import { deliverOutbox } from '../_shared/notification-outbox.ts';
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
function notifyAfterBooking(admin: SupabaseClient, companyId: string) {
  const task = deliverOutbox(admin, companyId).catch(error => console.error('[public-booking] Notification queued', error));
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const BookingSchema = z.object({
  request_id: z.string().uuid(),
  website: z.string().max(0).optional().default(''),
  slug: z.string().trim().min(1).max(100),
  customer_name: z.string().trim().min(2).max(160),
  customer_email: z.string().trim().email().max(254),
  customer_phone: z.string().trim().min(5).max(60),
  preferred_date: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(6000).optional(),
  attachment_paths: z.array(z.string().trim().max(500)).max(5).default([]),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function getClientFingerprint(req: Request) {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `${ip}|${userAgent.slice(0, 200)}`;
}

function makeOrderNumber(requestId: string) {
  return `AT-${requestId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const parsed = BookingSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: 'Ogiltiga bokningsuppgifter', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name')
      .eq('public_booking_slug', parsed.data.slug)
      .limit(1)
      .maybeSingle();

    if (companyError || !company) return json({ error: 'Bokningssidan är inte kopplad till något företag' }, 404);

    const { data: existing, error: existingError } = await admin
      .from('booking_requests')
      .select('id, public_order_number, company_id')
      .eq('public_request_id', parsed.data.request_id)
      .maybeSingle();

    if (existingError) {
      console.error('[public-booking] idempotency lookup failed', existingError);
      return json({ error: 'Kunde inte kontrollera förfrågan' }, 500);
    }
    if (existing && existing.company_id !== company.id) return json({ error: 'Bokningsreferensen används redan. Ladda om formuläret.' }, 409);
    if (existing) {
      return json({ booking: existing, order_number: existing.public_order_number, duplicate: true }, 200);
    }

    const fingerprint = await sha256(getClientFingerprint(req));
    const { data: allowed, error: rateLimitError } = await admin.rpc('consume_public_booking_rate_limit', {
      p_company_id: company.id,
      p_fingerprint: fingerprint,
      p_limit: 5,
    });

    if (rateLimitError) {
      console.error('[public-booking] rate limit check failed', rateLimitError);
      return json({ error: 'Bokningen kunde inte verifieras. Försök igen om en stund.' }, 503);
    }
    if (!allowed) return json({ error: 'För många försök. Vänta tio minuter och försök igen.' }, 429);

    const attachmentPrefix = `public/${parsed.data.request_id}/`;
    if (parsed.data.attachment_paths.some(path => !path.startsWith(attachmentPrefix) || path.includes('..') || path.slice(attachmentPrefix.length).includes('/'))) {
      return json({ error: 'Ogiltig bilagereferens' }, 400);
    }

    const orderNumber = makeOrderNumber(parsed.data.request_id);
    const description = [
      `Ordernummer: ${orderNumber}`,
      parsed.data.description || '',
    ].filter(Boolean).join('\n');

    const { data: booking, error: bookingError } = await admin
      .from('booking_requests')
      .insert({
        company_id: company.id,
        customer_name: parsed.data.customer_name,
        customer_email: parsed.data.customer_email,
        customer_phone: parsed.data.customer_phone,
        preferred_date: parsed.data.preferred_date,
        title: parsed.data.title,
        description,
        status: 'pending',
        public_request_id: parsed.data.request_id,
        public_order_number: orderNumber,
      })
      .select('id, public_order_number')
      .single();

    if (bookingError) {
      if (bookingError.code === '23505') {
        const { data: duplicate } = await admin
          .from('booking_requests')
          .select('id, public_order_number')
          .eq('company_id', company.id)
          .eq('public_request_id', parsed.data.request_id)
          .maybeSingle();
        if (duplicate) {
          notifyAfterBooking(admin, company.id);
          return json({ booking: duplicate, order_number: duplicate.public_order_number, duplicate: true }, 200);
        }
      }
      throw bookingError;
    }

    // Booking and notification events commit together through the database trigger.
    notifyAfterBooking(admin, company.id);

    return json({ booking, order_number: orderNumber }, 201);
  } catch (error: unknown) {
    console.error('[public-booking] unexpected error', error);
    return json({ error: 'Kunde inte skapa transportförfrågan' }, 500);
  }
});
