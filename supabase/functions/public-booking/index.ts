import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';
import { bookingRequestCreatedEmail, bookingRequestConfirmationEmail } from '../_shared/email-templates.ts';

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
      .select('id, public_order_number')
      .eq('company_id', company.id)
      .eq('public_request_id', parsed.data.request_id)
      .maybeSingle();

    if (existingError) {
      console.error('[public-booking] idempotency lookup failed', existingError);
      return json({ error: 'Kunde inte kontrollera förfrågan' }, 500);
    }
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
    if (parsed.data.attachment_paths.some(path => !path.startsWith(attachmentPrefix))) {
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
        if (duplicate) return json({ booking: duplicate, order_number: duplicate.public_order_number, duplicate: true }, 200);
      }
      throw bookingError;
    }

    const { data: outboxRows } = await admin.from('notification_outbox').insert([
      {
        channel: 'email',
        type: 'booking_request_created',
        subject: `Ny transportförfrågan ${orderNumber}`,
        payload: {
          companyId: company.id,
          companyName: company.name,
          orderNumber,
          bookingId: booking.id,
          attachmentPaths: parsed.data.attachment_paths,
        },
        status: 'pending',
      },
      {
        channel: 'email',
        type: 'booking_request_customer_confirmation',
        recipient_email: parsed.data.customer_email,
        subject: `Vi har tagit emot din transportförfrågan ${orderNumber}`,
        payload: {
          companyId: company.id,
          companyName: company.name,
          orderNumber,
          bookingId: booking.id,
        },
        status: 'pending',
      },
    ]).select('id, type');

    const [{ data: companySettings }, { data: adminProfile }] = await Promise.all([
      admin.from('settings').select('email').eq('company_id', company.id).maybeSingle(),
      admin.from('profiles').select('email').eq('company_id', company.id).eq('role', 'admin').not('email', 'is', null).limit(1).maybeSingle(),
    ]);
    const adminEmail = companySettings?.email || adminProfile?.email || 'info@auroramedia.se';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sendMail = async (to: string, tpl: { subject: string; html: string }) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ to, subject: tpl.subject, html: tpl.html }),
      });
      if (!res.ok) {
        console.error('[public-booking] send-email failed', await res.text());
        return false;
      }
      return true;
    };

    const adminTpl = bookingRequestCreatedEmail({
      companyName: company.name,
      orderNumber,
      customerName: parsed.data.customer_name,
      customerEmail: parsed.data.customer_email,
      customerPhone: parsed.data.customer_phone,
      preferredDate: parsed.data.preferred_date,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      attachmentCount: parsed.data.attachment_paths.length,
      adminUrl: 'https://auroratransport.se/admin/booking-requests',
    });
    const customerTpl = bookingRequestConfirmationEmail({
      contactName: parsed.data.customer_name,
      companyName: company.name,
      orderNumber,
      title: parsed.data.title,
      preferredDate: parsed.data.preferred_date,
    });

    const [adminOk, customerOk] = await Promise.all([
      sendMail(adminEmail, adminTpl),
      sendMail(parsed.data.customer_email, customerTpl),
    ]);

    const updateStatus = async (type: string, ok: boolean) => {
      const row = outboxRows?.find(r => r.type === type);
      if (!row) return;
      await admin.from('notification_outbox').update({
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : null,
      }).eq('id', row.id);
    };

    await Promise.all([
      updateStatus('booking_request_created', adminOk),
      updateStatus('booking_request_customer_confirmation', customerOk),
    ]);

    return json({ booking, order_number: orderNumber }, 201);
  } catch (error: unknown) {
    console.error('[public-booking] unexpected error', error);
    return json({ error: 'Kunde inte skapa transportförfrågan' }, 500);
  }
});
