import { describe, expect, it } from 'vitest';
import { invoicePayload, parseTokens, sameCompany, validOrganizationNumber } from './validation';
const invoice = { id: 'invoice-a', status: 'draft', invoice_date: '2026-09-08', due_date: '2026-10-08', lines: [{ description: 'Transport', quantity: 2, unitPrice: 100, vatRate: 25 }], total_ex_vat: 200, vat_amount: 50, total_inc_vat: 250 };
describe('Fortnox company and invoice validation', () => {
  it('normalizes organization numbers but rejects bad checksums and another company', () => {
    expect(validOrganizationNumber('559272-0220')).toBe(true);
    expect(validOrganizationNumber('559123-4567')).toBe(false);
    expect(validOrganizationNumber('0000000000')).toBe(false);
    expect(sameCompany('559272-0220', '5592720220')).toBe(true);
    expect(sameCompany('5592720220', '5560160680')).toBe(false);
  });
  it('requires all agreed scopes and a bounded token expiry', () => {
    const token = { access_token: 'access', refresh_token: 'refresh', expires_in: 3600, scope: 'companyinformation customer invoice' };
    expect(parseTokens(token).scopes).toHaveLength(3);
    for (const bad of [{ ...token, scope: 'invoice' }, { ...token, expires_in: -1 }, { ...token, refresh_token: '' }, null]) expect(() => parseTokens(bad)).toThrow();
  });
  it('exports saved rows with a stable reconciliation reference, without sending or bookkeeping', () => {
    const result = invoicePayload(invoice, '1001').Invoice;
    expect(result.InvoiceRows).toEqual([{ Description: 'Transport', DeliveredQuantity: '2', Price: 100, VAT: 25 }]);
    expect(result.ExternalInvoiceReference1).toBe('aurora-invoice-a');
    expect(result).not.toHaveProperty('Booked');
    expect(result).not.toHaveProperty('Sent');
  });
  it.each([
    { status: 'sent' }, { status: 'paid' }, { total_inc_vat: 251 }, { total_ex_vat: 201 }, { vat_amount: 49 }, { lines: [] },
    { lines: [{ description: 'X', quantity: -1, unitPrice: 100, vatRate: 25 }] },
    { lines: [{ description: 'X', quantity: 1, unitPrice: 100, vatRate: 19 }] },
    { due_date: '2026-01-01' },
  ])('rejects unsafe or inconsistent invoice data: %j', change => expect(() => invoicePayload({ ...invoice, ...change }, '1001')).toThrow());
});
