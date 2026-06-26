import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fortnoxApi } from '../_shared/fortnox-api.ts';
import { fortnoxCustomerPayload, fortnoxInvoicePayload } from '../_shared/fortnox-invoice.ts';
import { getValidFortnoxToken } from '../_shared/fortnox-token-store.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply({ error: 'Server configuration missing' }, 500);

  const auth = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: role } = await admin.from('user_roles').select('company_id,role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role?.company_id) return reply({ error: 'Admin access required' }, 403);

  const body = await request.json().catch(() => ({})) as { action?: string; invoiceId?: string };
  try {
    if (body.action === 'status') {
      const { data } = await admin.from('fortnox_connections')
        .select('status,scopes,token_expires_at,fortnox_company_name,fortnox_organization_number,connected_at,last_error')
        .eq('company_id', role.company_id)
        .maybeSingle();
      return reply({ connection: data });
    }

    if (body.action === 'disconnect') {
      await admin.from('fortnox_connections').update({ status: 'revoked', updated_at: new Date().toISOString() }).eq('company_id', role.company_id);
      return reply({ disconnected: true });
    }

    if (body.action !== 'export_invoice' || !body.invoiceId) return reply({ error: 'Unknown action' }, 400);
    const { data: existing } = await admin.from('fortnox_invoice_syncs')
      .select('status,fortnox_document_number,response_payload')
      .eq('company_id', role.company_id)
      .eq('invoice_id', body.invoiceId)
      .maybeSingle();
    if (existing?.status === 'synced') return reply({ synced: true, documentNumber: existing.fortnox_document_number, duplicate: true });

    const { data: invoice, error: invoiceError } = await admin.from('invoices')
      .select('*, customer:customers(*)')
      .eq('id', body.invoiceId)
      .eq('company_id', role.company_id)
      .maybeSingle();
    if (invoiceError || !invoice) throw invoiceError ?? new Error('Fakturan hittades inte');

    const { data: lines, error: linesError } = await admin.from('invoice_lines').select('*').eq('invoice_id', body.invoiceId);
    if (linesError) throw linesError;
    const accessToken = await getValidFortnoxToken(admin, role.company_id, user.id);

    let customerNumber = '';
    const { data: mapping } = await admin.from('fortnox_customer_mappings').select('fortnox_customer_number').eq('company_id', role.company_id).eq('customer_id', invoice.customer_id).maybeSingle();
    customerNumber = mapping?.fortnox_customer_number ?? '';
    if (!customerNumber) {
      const customerResponse = await fortnoxApi('/customers', accessToken, {
        method: 'POST',
        body: JSON.stringify(fortnoxCustomerPayload(invoice.customer)),
      });
      const createdCustomer = customerResponse.Customer as Record<string, unknown> | undefined;
      customerNumber = String(createdCustomer?.CustomerNumber ?? '');
      if (!customerNumber) throw new Error('Fortnox returnerade inget kundnummer');
      await admin.from('fortnox_customer_mappings').upsert({
        company_id: role.company_id,
        customer_id: invoice.customer_id,
        fortnox_customer_number: customerNumber,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,customer_id' });
    }

    const payload = fortnoxInvoicePayload(invoice, customerNumber, lines ?? []);
    await admin.from('fortnox_invoice_syncs').upsert({
      company_id: role.company_id,
      invoice_id: body.invoiceId,
      status: 'pending',
      request_payload: payload,
      error_message: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,invoice_id' });

    const fortnoxResponse = await fortnoxApi('/invoices', accessToken, { method: 'POST', body: JSON.stringify(payload) });
    const exported = fortnoxResponse.Invoice as Record<string, unknown> | undefined;
    const documentNumber = String(exported?.DocumentNumber ?? '');
    if (!documentNumber) throw new Error('Fortnox returnerade inget dokumentnummer');

    await admin.from('fortnox_invoice_syncs').update({
      fortnox_document_number: documentNumber,
      status: 'synced',
      response_payload: fortnoxResponse,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('company_id', role.company_id).eq('invoice_id', body.invoiceId);
    return reply({ synced: true, documentNumber });
  } catch (error) {
    console.error('[fortnox-api]', error);
    if (body.invoiceId) await admin.from('fortnox_invoice_syncs').upsert({
      company_id: role.company_id,
      invoice_id: body.invoiceId,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Fortnox-synk misslyckades',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,invoice_id' });
    return reply({ error: error instanceof Error ? error.message : 'Fortnox-synk misslyckades' }, 500);
  }
});
