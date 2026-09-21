import { corsHeaders } from '../_shared/cors.ts';
import { escapeEmail, type Mail } from '../_shared/resend.ts';

export type SharedAssignment = {
  id: string; company_id: string; title: string; status: string;
  scheduled_start: string; address?: string | null; pickup_address?: string | null;
  delivery_address?: string | null; customer: { name?: string; email?: string | null } | null;
};
export type ShareDependencies = {
  user: (token: string) => Promise<{ id: string } | null>;
  companyId: (userId: string) => Promise<string | null>;
  isAdmin: (userId: string, companyId: string) => Promise<boolean>;
  company: (companyId: string) => Promise<{ name: string; org_nr: string | null } | null>;
  assignment: (id: string, companyId: string) => Promise<SharedAssignment | null>;
  allowSend: (companyId: string) => Promise<boolean>;
  send: (mail: Mail, key: string) => Promise<{ id: string }>;
};
const responseHeaders = { ...corsHeaders, 'Cache-Control': 'no-store', 'X-Aurora-Assignment-Mail': '2026-09-21' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...responseHeaders, 'Content-Type': 'application/json' },
});
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const labels: Record<string, string> = { pending: 'Planerad', unassigned: 'Planerad', active: 'Pågående', delayed: 'Försenad', completed: 'Slutförd', cancelled: 'Avbokad' };

export async function handleShareAssignment(req: Request, deps: ShareDependencies) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: responseHeaders });
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405);
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Logga in innan du skickar.' }, 401);
    const user = await deps.user(token);
    if (!user) return json({ error: 'Logga in innan du skickar.' }, 401);
    const text = await req.text();
    if (text.length > 12_000) return json({ error: 'Meddelandet är för stort.' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return json({ error: 'Ogiltig förfrågan.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.assignment_id !== 'string' || !uuid.test(body.assignment_id)) return json({ error: 'Ogiltigt uppdrag.' }, 400);
    const notification = body.mode === 'customer_notification';
    if (body.mode !== undefined && !['share', 'customer_notification'].includes(String(body.mode))) return json({ error: 'Ogiltig avisering.' }, 400);
    if (body.request_id !== undefined && (typeof body.request_id !== 'string' || !uuid.test(body.request_id))) return json({ error: 'Ogiltigt utskick.' }, 400);
    if (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 4000)) return json({ error: 'Meddelandet får innehålla högst 4000 tecken.' }, 400);
    const companyId = await deps.companyId(user.id);
    if (!companyId || !await deps.isAdmin(user.id, companyId)) return json({ error: 'Företagsadministratör krävs.' }, 403);
    const company = await deps.company(companyId);
    if (!company) return json({ error: 'Företaget kunde inte hämtas.' }, 404);
    if (['556000-0001', '556000-0002'].includes(company.org_nr ?? '')) return json({ error: 'Mejl skickas inte från demoföretag.' }, 403);
    const assignment = await deps.assignment(body.assignment_id, companyId);
    if (!assignment || assignment.company_id !== companyId) return json({ error: 'Uppdraget hittades inte.' }, 404);
    const recipient = notification ? assignment.customer?.email : body.recipient_email;
    if (typeof recipient !== 'string' || recipient.trim().length > 254 || !email.test(recipient.trim())) return json({ error: notification ? 'Kunden saknar en giltig e-postadress.' : 'Ange en giltig e-postadress.' }, 400);
    const when = new Date(assignment.scheduled_start);
    if (!Number.isFinite(when.getTime())) return json({ error: 'Kontrollera uppdragets starttid innan du skickar.' }, 400);
    const scheduled = when.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'long', timeStyle: 'short' });
    const title = notification ? 'Uppdatering om din transport' : 'Uppdragsinformation';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const row = (label: string, value: unknown) => value ? `<p><strong>${label}:</strong> ${escapeEmail(value)}</p>` : '';
    const mail: Mail = {
      to: recipient.trim().toLowerCase(),
      subject: `${title}: ${assignment.title} – ${company.name}`.replace(/[\r\n]/g, ' '),
      html: `<h1>${title}</h1><h2>${escapeEmail(assignment.title)}</h2>${row('Status', labels[assignment.status] || 'Registrerad')}${row('Planerad start (svensk tid)', scheduled)}${row('Hämtning', assignment.pickup_address || assignment.address)}${row('Leverans', assignment.delivery_address)}${message ? `<p style="white-space:pre-wrap">${escapeEmail(message)}</p>` : ''}<p>${escapeEmail(company.name)}</p>`,
    };
    // Same payload and request keeps the provider key stable after a timeout.
    // Legacy clients without request_id deduplicate identical mail for one day.
    const keyInput = JSON.stringify([companyId, assignment.id, body.request_id ?? new Date().toISOString().slice(0, 10), mail]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyInput));
    const key = `assignment/${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
    if (!await deps.allowSend(companyId)) return json({ error: 'För många utskick. Försök igen senare.' }, 429);
    const result = await deps.send(mail, key);
    if (!result?.id?.trim()) throw new Error('Mail provider did not acknowledge the request');
    return json({ success: true, id: result.id, recipient: mail.to });
  } catch {
    return json({ error: 'Mejlet kunde inte bekräftas som skickat. Försök igen om en liten stund.' }, 502);
  }
}
