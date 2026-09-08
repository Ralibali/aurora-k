import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { assignmentConfirmationEmail, trackingStartedEmail, deliveryCompletedEmail, newCustomerMessageEmail, bookingRequestCreatedEmail, bookingRequestConfirmationEmail } from './email-templates.ts';
import { sendResendMail, safeTemplateData } from './resend.ts';
import { sitePath } from './site-url.ts';

export function renderTransportNotification(type: string, payload: Record<string, unknown>) {
  const data = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' ? value : value == null ? '' : String(value)]));
  if (type === 'new-customer-message') return newCustomerMessageEmail(safeTemplateData({ customerName: data.customerName, message: data.message, customerUrl: sitePath(`/admin/customers/${encodeURIComponent(data.customerId)}`) }));
  if (type === 'booking-request-created') return bookingRequestCreatedEmail({ companyName: data.companyName, orderNumber: data.orderNumber || 'Ny förfrågan', customerName: data.customerName, customerEmail: data.customerEmail, customerPhone: data.customerPhone || '', preferredDate: data.preferredDate || '', title: data.title, description: data.description, attachmentCount: 0, adminUrl: sitePath('/admin/booking-requests') });
  if (type === 'booking-request-confirmation') return bookingRequestConfirmationEmail({ contactName: data.customerName, companyName: data.companyName, orderNumber: data.orderNumber || 'Ny förfrågan', title: data.title, preferredDate: data.preferredDate || '' });
  if (['tracking-started', 'delivery-completed'].includes(type) && !data.trackingToken) throw new Error('Missing tracking token');
  const trackingUrl = sitePath(`/track/${encodeURIComponent(data.trackingToken)}`);
  if (type === 'tracking-started') return trackingStartedEmail({ assignmentTitle: data.title, driverName: data.driverName, trackingUrl });
  if (type === 'delivery-completed') return deliveryCompletedEmail({ assignmentTitle: data.title, completedAt: formatTime(data.completedAt), trackingUrl });
  if (type === 'assignment-confirmation') return assignmentConfirmationEmail(safeTemplateData({
    driverName: data.driverName, title: data.title, address: data.address, scheduledStart: formatTime(data.scheduledStart),
    customerName: data.customerName, priority: data.priority, instructions: data.instructions, adminComment: data.adminComment,
    appUrl: sitePath(`/driver/assignments/${encodeURIComponent(data.assignmentId)}`),
  }));
  throw new Error('Unknown notification type');
}

function formatTime(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(value).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'medium', timeStyle: 'short' });
}

export async function deliverOutbox(admin: SupabaseClient, companyId: string | null = null) {
  const { data: rows, error } = await admin.rpc('claim_notification_emails', { p_company_id: companyId, p_limit: 5 });
  if (error) throw error;
  let sent = 0, failed = 0;
  let attempted = false;
  for (const row of rows ?? []) {
    if (attempted) await new Promise(resolve => setTimeout(resolve, 550));
    attempted = true;
    try {
      if (!row.recipient_email) throw new Error('Missing recipient');
      const template = row.payload.mail ?? renderTransportNotification(row.type, row.payload);
      if (typeof template.subject !== 'string' || !template.subject.trim() || typeof template.html !== 'string' || !template.html.trim()) throw new Error('Invalid email content');
      await sendResendMail({ to: row.recipient_email, subject: template.subject, html: template.html }, `outbox/${row.id}`);
      const { data: updated, error: updateError } = await admin.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', row.id).eq('attempts', row.attempts).in('status', ['pending', 'failed']).select('id').maybeSingle();
      if (updateError) throw updateError;
      if (updated) sent++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Email delivery failed';
      await admin.from('notification_outbox').update({ status: 'failed', last_error: message.slice(0,500) }).eq('id', row.id).eq('attempts', row.attempts).in('status', ['pending', 'failed']);
      console.error('[notification-outbox]', row.id, message);
    }
  }
  return { sent, failed };
}

export async function queueMail(admin: SupabaseClient, input: { companyId?: string | null; eventKey: string; to: string; type: string; subject: string; html: string }) {
  const { error } = await admin.from('notification_outbox').upsert({
    company_id: input.companyId ?? null, recipient_email: input.to, channel: 'email', type: input.type,
    event_key: input.eventKey, payload: { mail: { subject: input.subject, html: input.html } },
  }, { onConflict: 'event_key', ignoreDuplicates: true });
  if (error) throw error;
}
