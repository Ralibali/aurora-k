import { corsHeaders } from '../_shared/cors.ts';
type Mail = { to: string; subject: string; html: string };
const escapeEmail = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

type AuthUser = { id: string; email_confirmed_at?: string | null };
type Registration = { companyName: string; orgNr: string; fullName: string; phone: string };
export type AuthEmailDependencies = {
  siteUrl: string;
  authUrl: string;
  rateLimit: (key: string, limit: number, seconds: number) => Promise<boolean>;
  findUser: (email: string) => Promise<AuthUser | null>;
  createUser: (input: { email: string; password: string; email_confirm: false; user_metadata: { full_name: string; company_registration: Registration } }) => Promise<{ data: { user: AuthUser | null }; error: { code?: string } | null }>;
  generateLink: (input: { type: 'signup'; email: string; password: string } | { type: 'recovery'; email: string }) => Promise<{ data: { properties: { action_link: string; hashed_token: string; verification_type: string } | null }; error: unknown }>;
  sendMail: (mail: Mail, key: string) => Promise<unknown>;
  reportFailure: (stage: string) => void;
};

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function registrationData(value: unknown): Registration | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const bounded = (key: string, max: number) => typeof input[key] === 'string' && input[key].trim().length > 0 && input[key].trim().length <= max ? input[key].trim() : '';
  const result = { companyName: bounded('companyName', 200), orgNr: bounded('orgNr', 11), fullName: bounded('fullName', 120), phone: bounded('phone', 40) };
  return result.companyName && /^\d{6}-?\d{4}$/.test(result.orgNr) && result.fullName && result.phone ? result : null;
}

export async function handleAuthEmail(request: Request, deps: AuthEmailDependencies) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const accepted = () => json({ accepted: true });
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405);
  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8192) return json({ error: 'För stor förfrågan.' }, 413);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: 'Ogiltig förfrågan.' }, 400);
    input = parsed;
  } catch { return json({ error: 'Ogiltig förfrågan.' }, 400); }
  const type = input.type;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!['signup', 'resend', 'recovery'].includes(String(type)) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Ange en giltig e-postadress.' }, 400);
  const registration = type === 'signup' ? registrationData(input.registration) : null;
  if (type === 'signup' && (typeof input.password !== 'string' || input.password.length < 10 || new TextEncoder().encode(input.password).length > 72 || !registration)) {
    return json({ error: 'Kontrollera företagsuppgifterna och ange ett lösenord med minst 10 tecken (högst 72 byte).' }, 400);
  }
  // Use the last proxy-added address, never the caller-controlled first XFF
  // entry. Missing/invalid gateway headers share one fail-closed bucket.
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? '';
  const ip = /^[0-9a-f.:]{3,64}$/i.test(forwarded) ? forwarded.toLowerCase() : 'unknown';
  try {
    if (!await deps.rateLimit(`auth-email:ip:${await digest(ip)}`, 20, 3600)) return json({ error: 'För många försök. Vänta en stund och försök igen.' }, 429);
    if (!await deps.rateLimit(`auth-email:email:${await digest(email)}`, 4, 3600)) return accepted();
  } catch {
    deps.reportFailure('rate-limit');
    return json({ error: 'Mejltjänsten är tillfälligt otillgänglig. Försök igen senare.' }, 503);
  }

  let stage = 'lookup';
  try {
    if (type !== 'recovery') {
      let user = await deps.findUser(email);
      // Retrying an unfinished signup resends confirmation without replacing
      // the existing password or business metadata. Confirmed accounts remain
      // a private no-op, just as they are for the explicit resend action.
      if (type === 'signup' && !user) {
        stage = 'create-user';
        const created = await deps.createUser({ email, password: input.password as string, email_confirm: false, user_metadata: { full_name: registration!.fullName, company_registration: registration! } });
        if (created.error) {
          // Another request may have created this address concurrently. Never
          // update that account's password or business metadata.
          if (!['email_exists', 'user_already_exists'].includes(created.error.code ?? '')) throw new Error('create-user');
          user = await deps.findUser(email);
        } else user = created.data.user;
      }
      if (!user || user.email_confirmed_at) return accepted();
    }
    stage = 'generate-link';
    const verificationType = type === 'recovery' ? 'recovery' : 'signup';
    const result = await deps.generateLink(type === 'recovery'
      ? { type: 'recovery', email }
      // Existing users retain their original password; GoTrue ignores this
      // placeholder for them. No metadata is passed on a resend.
      : { type: 'signup', email, password: crypto.randomUUID() });
    const properties = result.data.properties;
    if (result.error || !properties?.action_link) {
      // Unknown recovery addresses and existing signup accounts have the same
      // public response as delivery, auth or other account-specific failures.
      deps.reportFailure('link-unavailable');
      return accepted();
    }
    const authLink = new URL(properties.action_link);
    if (authLink.origin !== new URL(deps.authUrl).origin || authLink.pathname !== '/auth/v1/verify' || !['https:', 'http:'].includes(authLink.protocol)) throw new Error('unexpected-link');
    if (properties.verification_type !== verificationType || !/^[A-Za-z0-9_-]{16,512}$/.test(properties.hashed_token)) throw new Error('unexpected-token');
    // Verify the token with a POST from our own confirmation page. Sending the
    // GoTrue action_link would depend on its redirect allowlist and let email
    // scanners consume the token before the recipient presses Confirm.
    const link = new URL('/auth/confirm', deps.siteUrl);
    if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password) throw new Error('unexpected-site');
    link.hash = new URLSearchParams({ token_hash: properties.hashed_token, type: verificationType }).toString();
    const subject = type === 'recovery' ? 'Återställ ditt lösenord – Aurora Transport' : 'Bekräfta din e-post – Aurora Transport';
    const action = type === 'recovery' ? 'Välj ett nytt lösenord' : 'Bekräfta e-post och fortsätt';
    const introduction = type === 'recovery' ? 'Du har begärt att återställa ditt lösenord.' : 'Bekräfta din e-postadress för att fortsätta registreringen av ditt företag.';
    stage = 'send';
    await deps.sendMail({ to: email, subject, html: `<div lang="sv" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033"><h1 style="font-size:24px">${escapeEmail(subject)}</h1><p>${introduction}</p><p style="margin:28px 0"><a href="${escapeEmail(link.href)}" style="background:#4f46e5;color:white;padding:14px 20px;border-radius:8px;text-decoration:none">${action}</a></p><p>Om du inte begärde detta kan du bortse från mejlet. Dela aldrig länken med någon annan.</p><p style="font-size:12px;color:#596579">Aurora Transport</p></div>` }, `auth-email-${await digest(link.href)}`);
    return accepted();
  } catch {
    // Do not log errors from Auth/Resend: they can contain email addresses,
    // provider payloads and bearer links. Only the operation name is logged.
    deps.reportFailure(stage);
    return accepted();
  }
}
