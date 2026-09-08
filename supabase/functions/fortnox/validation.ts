export const FORTNOX_SCOPES = ['companyinformation', 'customer', 'invoice'];
export const CALLBACK_PATH = '/integrations/fortnox/callback';
export const organizationNumber = (value: unknown) => typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
export function validOrganizationNumber(value: unknown) {
  const digits = organizationNumber(value);
  if (!/^\d{10}$/.test(digits) || /^0+$/.test(digits)) return false;
  return [...digits].reduce((sum, n, i) => { const v = Number(n) * (i % 2 ? 1 : 2); return sum + (v > 9 ? v - 9 : v); }, 0) % 10 === 0;
}
export function sameCompany(expected: unknown, actual: unknown) {
  return validOrganizationNumber(expected) && organizationNumber(expected) === organizationNumber(actual);
}
export async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function parseTokens(value: unknown) {
  const data = value as Record<string, unknown> | null;
  if (!data || typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in < 60 || data.expires_in > 86400 || typeof data.scope !== 'string') throw new Error('Ogiltigt svar från Fortnox. Anslut på nytt.');
  const scopes = data.scope.split(/\s+/);
  if (FORTNOX_SCOPES.some(scope => !scopes.includes(scope))) throw new Error('Fortnox saknar behörighet för företag, kunder eller fakturor. Anslut på nytt.');
  return { access: data.access_token, refresh: data.refresh_token, expires: new Date(Date.now() + data.expires_in * 1000).toISOString(), scopes };
}
export function invoicePayload(invoice: Record<string, unknown>, customerNumber: string) {
  if (invoice.status !== 'draft') throw new Error('Endast utkast kan exporteras till Fortnox.');
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(customerNumber)) throw new Error('Ange ett giltigt kundnummer i Fortnox.');
  if (!Array.isArray(invoice.lines) || !invoice.lines.length || invoice.lines.length > 200) throw new Error('Fakturan behöver sparade fakturarader. Öppna och spara underlaget först.');
  if (![invoice.invoice_date, invoice.due_date].every(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) || String(invoice.due_date) < String(invoice.invoice_date)) throw new Error('Kontrollera fakturadatum och förfallodatum.');
  let total = 0, vat = 0;
  const rows = invoice.lines.map((line: Record<string, unknown>) => {
    if (!line || typeof line.description !== 'string' || !line.description.trim() || line.description.length > 255 || typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0 || typeof line.unitPrice !== 'number' || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || ![0, 6, 12, 25].includes(Number(line.vatRate))) throw new Error('Kontrollera fakturaradernas beskrivning, antal, pris och moms.');
    total += line.quantity * line.unitPrice;
    vat += line.quantity * line.unitPrice * Number(line.vatRate) / 100;
    return { Description: line.description.trim(), DeliveredQuantity: String(line.quantity), Price: line.unitPrice, VAT: Number(line.vatRate) };
  });
  if (total <= 0 || !Number.isFinite(total + vat) || ![invoice.total_ex_vat, invoice.vat_amount, invoice.total_inc_vat].every(v => typeof v === 'number' && Number.isFinite(v)) || Math.abs(total - Number(invoice.total_ex_vat)) > 0.02 || Math.abs(vat - Number(invoice.vat_amount)) > 0.02 || Math.abs(total + vat - Number(invoice.total_inc_vat)) > 0.02) throw new Error('Fakturans totalsummor stämmer inte med raderna.');
  return { Invoice: { CustomerNumber: customerNumber, InvoiceDate: invoice.invoice_date, DueDate: invoice.due_date, Currency: 'SEK', VATIncluded: false, ExternalInvoiceReference1: `aurora-${invoice.id}`, InvoiceRows: rows } };
}
