import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { htmlToText, parseInboundOrder } from '../_shared/order-parser.ts';
import { processOrderAttachments } from '../_shared/order-attachments.ts';
import { extractOrderInboxKey, getReceivedEmail, listReceivedAttachments, verifyResendWebhook } from '../_shared/resend-receiving.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, svix-id, svix-signature, svix-timestamp' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!webhookSecret || !resendApiKey || !supabaseUrl || !serviceKey) return reply({ error: 'Server configuration missing' }, 500);

  const rawBody = await request.text();
  let event;
  try {
    event = verifyResendWebhook(rawBody, request.headers, webhookSecret);
  } catch {
    return reply({ error: 'Invalid webhook signature' }, 401);
  }
  if (event.type !== 'email.received') return reply({ accepted: true, ignored: true });

  const emailId = event.data?.email_id;
  if (!emailId) return reply({ error: 'Missing email id' }, 400);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: duplicate } = await supabase.from('inbound_order_emails').select('id,status').eq('provider_email_id', emailId).maybeSingle();
  if (duplicate) return reply({ accepted: true, duplicate: true, id: duplicate.id, status: duplicate.status });

  try {
    const email = await getReceivedEmail(emailId, resendApiKey);
    const inboxKey = extractOrderInboxKey([...(email.to ?? []), ...(event.data?.to ?? [])]);
    if (!inboxKey) return reply({ accepted: true, ignored: true, reason: 'No order inbox token' }, 202);

    const { data: channel, error: channelError } = await supabase
      .from('order_inbox_channels')
      .select('id,company_id,enabled')
      .eq('inbox_key', inboxKey)
      .maybeSingle();
    if (channelError) throw channelError;
    if (!channel?.enabled) return reply({ accepted: true, ignored: true, reason: 'Inbox disabled or unknown' }, 202);

    const { data: row, error: insertError } = await supabase.from('inbound_order_emails').insert({
      company_id: channel.company_id,
      channel_id: channel.id,
      provider_email_id: emailId,
      message_id: email.message_id ?? null,
      from_address: email.from,
      to_addresses: email.to ?? [],
      subject: email.subject ?? '',
      text_body: email.text ?? null,
      html_body: email.html ?? null,
      status: 'processing',
    }).select('id').single();
    if (insertError) throw insertError;

    const attachmentList = await listReceivedAttachments(emailId, resendApiKey);
    const processed = await processOrderAttachments(supabase, channel.company_id, row.id, attachmentList);
    const bodyText = email.text?.trim() || (email.html ? htmlToText(email.html) : '');
    const combinedText = [bodyText, ...processed.texts].filter(Boolean).join('\n\n---\n\n');
    const parsed = parseInboundOrder(combinedText, email.subject ?? '');
    const status = parsed.confidence >= 60 ? 'ready' : 'needs_review';

    const { error: updateError } = await supabase.from('inbound_order_emails').update({
      attachments: processed.rows,
      parsed_payload: parsed,
      parse_confidence: parsed.confidence,
      status,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (updateError) throw updateError;

    return reply({ accepted: true, id: row.id, status, confidence: parsed.confidence });
  } catch (error) {
    console.error('[resend-inbound-order]', error);
    const message = error instanceof Error ? error.message : 'Unknown processing error';
    await supabase.from('inbound_order_emails').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('provider_email_id', emailId);
    return reply({ error: 'Inbound email processing failed' }, 500);
  }
});
