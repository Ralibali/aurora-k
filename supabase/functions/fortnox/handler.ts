import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { corsHeaders } from '../_shared/cors.ts';
import { DEFAULT_SITE_URL } from '../_shared/site-url.ts';
import { CALLBACK_PATH, FORTNOX_SCOPES, digest, invoicePayload, organizationNumber, parseTokens, sameCompany, validOrganizationNumber } from './validation.ts';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
class UserError extends Error { constructor(message: string, public status = 400) { super(message); } }
class ProviderError extends UserError { constructor(public providerStatus: number) { super(`Fortnox kunde inte slutföra förfrågan (HTTP ${providerStatus}). Kontrollera anslutning, behörighet och uppgifter i Fortnox.`, 502); } }
const checked = <T>(result: { data: T; error: unknown }): T => { if (result.error) throw new Error('Database operation failed'); return result.data; };

export async function handleFortnox(req: Request, db: SupabaseClient, env: (name: string) => string | undefined, fetcher: typeof fetch = fetch) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let lock: { company: string; owner: string } | undefined;
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return json({ error: 'Logga in för att hantera Fortnox.' }, 401);
    const role = checked(await db.from('user_roles').select('company_id').eq('user_id', user.id).eq('role', 'admin').maybeSingle());
    if (!role?.company_id) return json({ error: 'Företagsadministratör krävs.' }, 403);
    const companyId = role.company_id;
    const company = checked(await db.from('companies').select('name,org_nr').eq('id', companyId).single());
    if (!company) throw new UserError('Företaget hittades inte.', 404);
    const raw = await req.text();
    if (raw.length > 8000) return json({ error: 'För stor förfrågan.' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Ogiltig förfrågan.' }, 400); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return json({ error: 'Ogiltig förfrågan.' }, 400);
    const clientId = env('FORTNOX_CLIENT_ID');
    const secret = env('FORTNOX_CLIENT_SECRET');
    const redirect = `${(env('SITE_URL') || env('PUBLIC_SITE_URL') || DEFAULT_SITE_URL).replace(/\/$/, '')}${CALLBACK_PATH}`;
    const configured = Boolean(clientId && secret && (!env('FORTNOX_REDIRECT_URI') || env('FORTNOX_REDIRECT_URI') === redirect));
    const connection = checked(await db.from('fortnox_connections').select('status,fortnox_company_name,fortnox_organization_number,last_error,connected_at').eq('company_id', companyId).maybeSingle());
    if (body.action === 'status') return json({ configured, company: { name: company.name, organizationNumber: company.org_nr }, organizationValid: validOrganizationNumber(company.org_nr), connection, redirectUri: redirect });
    if (!configured) throw new UserError('Fortnox-appen behöver konfigureras innan företaget kan anslutas.', 503);
    if (['556000-0001', '556000-0002'].includes(company.org_nr)) throw new UserError('Fortnox kan inte anslutas från ett demoföretag.', 403);
    if (!['connect', 'complete', 'verify', 'disconnect', 'customer', 'export', 'reconcile'].includes(String(body.action))) throw new UserError('Okänd åtgärd.');
    const allowed = checked(await db.rpc('consume_mail_rate_limit', { p_key: `fortnox/${companyId}`, p_limit: 30, p_window_seconds: 60 }));
    if (!allowed) throw new UserError('För många försök. Vänta en minut.', 429);
    if (!validOrganizationNumber(company.org_nr)) throw new UserError('Företagets organisationsnummer måste kontrolleras innan Fortnox ansluts.');
    const owner = crypto.randomUUID();
    if (!checked(await db.rpc('claim_fortnox_operation', { p_company_id: companyId, p_owner: owner }))) throw new UserError('Fortnox arbetar med en tidigare förfrågan. Försök igen om en stund.', 409);
    lock = { company: companyId, owner };
    const oauth = async (path: string, params: Record<string, string>) => {
      const response = await fetcher(`https://apps.fortnox.se/oauth-v1/${path}`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new UserError(response.status < 500 ? 'Fortnox nekade anslutningen. Kontrollera appens behörigheter och anslut på nytt.' : 'Fortnox är tillfälligt otillgängligt.', 502);
      return await response.json();
    };
    const api = async (access: string, path: string, payload?: unknown) => {
      const response = await fetcher(`https://api.fortnox.se/3/${path}`, { method: payload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${access}`, Accept: 'application/json', 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new ProviderError(response.status);
      return data;
    };
    const saveTokens = async (tokens: ReturnType<typeof parseTokens>) => checked(await db.rpc('store_fortnox_tokens', { p_company_id: companyId, p_user_id: user.id, p_access_token: tokens.access, p_refresh_token: tokens.refresh, p_expires_at: tokens.expires, p_scopes: tokens.scopes }));
    const verifyCompany = async (access: string) => {
      const info = (await api(access, 'companyinformation')).CompanyInformation;
      if (!sameCompany(company.org_nr, info?.OrganizationNumber)) throw new UserError('Bolaget i Fortnox har ett annat organisationsnummer. Välj rätt bolag och anslut på nytt.', 409);
      return info;
    };
    if (body.action === 'connect') {
      const state = crypto.randomUUID() + crypto.randomUUID();
      checked(await db.from('fortnox_oauth_states').delete().eq('company_id', companyId).is('used_at', null));
      checked(await db.from('fortnox_oauth_states').insert({ state_hash: await digest(state), company_id: companyId, user_id: user.id, expected_org_number: organizationNumber(company.org_nr), expires_at: new Date(Date.now() + 600000).toISOString() }));
      const url = new URL('https://apps.fortnox.se/oauth-v1/auth');
      url.search = new URLSearchParams({ client_id: clientId!, redirect_uri: redirect, scope: FORTNOX_SCOPES.join(' '), state, access_type: 'offline', response_type: 'code' }).toString();
      return json({ url: url.href, state });
    }
    if (body.action === 'complete') {
      if (typeof body.state !== 'string' || body.state.length !== 72 || typeof body.code !== 'string' || !body.code || body.code.length > 2000) throw new UserError('Anslutningen saknar giltigt svar från Fortnox.');
      const state = checked(await db.from('fortnox_oauth_states').update({ used_at: new Date().toISOString() }).eq('state_hash', await digest(body.state)).eq('company_id', companyId).eq('user_id', user.id).eq('expected_org_number', organizationNumber(company.org_nr)).is('used_at', null).gt('expires_at', new Date().toISOString()).select('id').maybeSingle());
      if (!state) throw new UserError('Anslutningsförsöket är förbrukat eller har gått ut. Börja om.', 409);
      const tokens = parseTokens(await oauth('token', { grant_type: 'authorization_code', code: body.code, redirect_uri: redirect }));
      const info = await verifyCompany(tokens.access);
      await saveTokens(tokens);
      checked(await db.from('fortnox_connections').update({ fortnox_company_name: info.CompanyName, fortnox_organization_number: info.OrganizationNumber }).eq('company_id', companyId));
      return json({ connected: true, name: info.CompanyName });
    }
    const saved = checked(await db.rpc('read_fortnox_tokens', { p_company_id: companyId }))?.[0];
    if (!saved) throw new UserError('Anslut företaget till Fortnox först.', 409);
    if (body.action === 'disconnect') {
      const result = await oauth('revoke', { token_type_hint: 'refresh_token', token: saved.refresh_token });
      if (result?.revoked !== true) throw new UserError('Fortnox bekräftade inte frånkopplingen. Försök igen.', 502);
      checked(await db.rpc('disconnect_fortnox', { p_company_id: companyId }));
      return json({ disconnected: true });
    }
    if (saved.status !== 'connected') throw new UserError('Fortnox-anslutningen behöver förnyas. Anslut på nytt.', 409);
    let access = saved.access_token;
    if (new Date(saved.token_expires_at).getTime() < Date.now() + 120000) {
      // All Fortnox operations share a company lease, so refresh tokens rotate once.
      try {
        const tokens = parseTokens(await oauth('token', { grant_type: 'refresh_token', refresh_token: saved.refresh_token }));
        await saveTokens(tokens);
        access = tokens.access;
      } catch {
        checked(await db.from('fortnox_connections').update({ status: 'expired', last_error: 'Anslut på nytt för att fortsätta.' }).eq('company_id', companyId));
        throw new UserError('Fortnox-anslutningen behöver förnyas. Anslut på nytt.', 409);
      }
    }
    if (!sameCompany(company.org_nr, connection?.fortnox_organization_number)) throw new UserError('Företagsuppgifterna har ändrats. Anslut rätt bolag på nytt.', 409);
    if (body.action === 'verify') {
      const info = await verifyCompany(access);
      checked(await db.from('fortnox_connections').update({ status: 'connected', last_error: null, fortnox_company_name: info.CompanyName }).eq('company_id', companyId));
      return json({ connected: true, name: info.CompanyName });
    }
    if (typeof body.invoiceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.invoiceId)) throw new UserError('Ogiltig faktura.');
    const invoice = checked(await db.from('invoices').select('*,customer:customers(name,org_number,company_id)').eq('id', body.invoiceId).eq('company_id', companyId).maybeSingle());
    if (!invoice || invoice.customer?.company_id !== companyId) throw new UserError('Fakturan hittades inte.', 404);
    const previous = checked(await db.from('fortnox_invoice_syncs').select('status,fortnox_document_number,request_payload').eq('company_id', companyId).eq('invoice_id', invoice.id).maybeSingle());
    if (previous?.status === 'synced') return json({ documentNumber: previous.fortnox_document_number, alreadyExported: true });
    if (body.action === 'reconcile' && !previous) throw new UserError('Ingen tidigare export har registrerats för fakturan.', 404);
    if (body.action === 'reconcile' || previous?.status === 'pending') {
      const found = (await api(access, `invoices?externalinvoicereference1=${encodeURIComponent(`aurora-${invoice.id}`)}`)).Invoices;
      if (Array.isArray(found) && found.length === 1 && found[0].DocumentNumber && String(found[0].CustomerNumber) === String(previous?.request_payload?.Invoice?.CustomerNumber)) {
        const documentNumber = String(found[0].DocumentNumber);
        checked(await db.from('fortnox_invoice_syncs').update({ status: 'synced', fortnox_document_number: documentNumber, error_message: null, synced_at: new Date().toISOString() }).eq('company_id', companyId).eq('invoice_id', invoice.id));
        return json({ documentNumber });
      }
      // An uncertain POST must never be retried automatically, even after a timeout.
      throw new UserError('Exportens resultat är oklart. Kontrollera Fortnox innan ett nytt utkast skapas. Kontakta support om ingen faktura finns.', 409);
    }
    const number = typeof body.customerNumber === 'string' ? body.customerNumber.trim() : '';
    const payload = invoicePayload(invoice, number);
    const customer = (await api(access, `customers/${encodeURIComponent(number)}`)).Customer;
    if (!customer || customer.Active === false || !customer.Name) throw new UserError('Fortnox-kunden saknas eller är inaktiv.');
    if (customer.Currency !== 'SEK' || customer.CountryCode !== 'SE' || customer.VATType !== 'SEVAT') throw new UserError('Den här exporten stöder svenska kunder med SEK och vanlig svensk moms. Hantera andra fakturor direkt i Fortnox.');
    if (invoice.customer.org_number && organizationNumber(invoice.customer.org_number) !== organizationNumber(customer.OrganisationNumber)) throw new UserError('Kundens organisationsnummer skiljer sig mellan Aurora och Fortnox. Kontrollera kundnumret.', 409);
    if (body.action === 'customer') return json({ customer: { number: String(customer.CustomerNumber), name: customer.Name, organizationNumber: customer.OrganisationNumber }, total: invoice.total_inc_vat });
    if (body.customerName !== customer.Name) throw new UserError('Kontrollera och bekräfta Fortnox-kunden först.');
    await verifyCompany(access);
    const pending = { company_id: companyId, invoice_id: invoice.id, status: 'pending', request_payload: payload, error_message: null };
    checked(previous?.status === 'failed'
      ? await db.from('fortnox_invoice_syncs').update(pending).eq('company_id', companyId).eq('invoice_id', invoice.id)
      : await db.from('fortnox_invoice_syncs').insert(pending));
    let result;
    try { result = await api(access, 'invoices', payload); }
    catch (error) {
      // Explicit validation/auth/rate-limit rejections cannot have created an invoice.
      // Timeouts, 5xx and malformed successes remain pending for reconciliation.
      if (error instanceof ProviderError && [400, 401, 403, 404, 405, 415, 422, 429].includes(error.providerStatus)) {
        checked(await db.from('fortnox_invoice_syncs').update({ status: 'failed', error_message: error.message }).eq('company_id', companyId).eq('invoice_id', invoice.id));
      }
      throw error;
    }
    if (!result.Invoice?.DocumentNumber) throw new UserError('Fortnox bekräftade inget fakturanummer. Kontrollera exportstatus innan du fortsätter.', 502);
    const documentNumber = String(result.Invoice.DocumentNumber);
    checked(await db.from('fortnox_invoice_syncs').update({ status: 'synced', fortnox_document_number: documentNumber, synced_at: new Date().toISOString() }).eq('company_id', companyId).eq('invoice_id', invoice.id));
    return json({ documentNumber });
  } catch (error) {
    if (error instanceof UserError) return json({ error: error.message }, error.status);
    // Provider responses and credentials must never enter application logs.
    return json({ error: error instanceof Error && /^(Endast|Ange|Fakturan|Kontrollera|Ogiltigt svar|Fortnox saknar)/.test(error.message) ? error.message : 'Förfrågan kunde inte slutföras. Kontrollera status innan du försöker igen.' }, 502);
  } finally {
    if (lock) await db.from('fortnox_operation_locks').delete().eq('company_id', lock.company).eq('owner', lock.owner);
  }
}
