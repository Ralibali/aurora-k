import { describe, expect, it } from 'vitest';
import { assignmentInvoiceLines, invoiceLinesError, invoiceSelection, missingInvoiceSources } from './invoice-preparation';

const assignment = { id: 'a1', title: 'Transport', actual_start: '2026-09-08T08:00:00Z', actual_stop: '2026-09-08T10:00:00Z', cost: null };
const customer = { pricing_type: 'per_hour', price_per_hour: 500, price_per_delivery: null };
const article = { id: 'source1', article_id: 'article1', name: 'Pall', quantity: 2, unit: 'st', unit_price: 300, vat_rate: 25 };
const baseLines = () => assignmentInvoiceLines(assignment, customer, [], new Map());

describe('invoice preparation', () => {
  it('supports invoice-basis URL selections and detail-page state, deduplicating IDs', () => {
    expect(invoiceSelection('?customer=c1&assignments=a1,%20a2,a1,', { customerId: 'old', assignmentIds: ['old'] })).toEqual({ customerId: 'c1', assignmentIds: ['a1', 'a2'] });
    expect(invoiceSelection('', { customerId: 'c1', assignmentIds: ['a1'] })).toEqual({ customerId: 'c1', assignmentIds: ['a1'] });
    expect(invoiceSelection('?customer=&assignments=', { customerId: 'old', assignmentIds: ['old'] })).toEqual({ customerId: '', assignmentIds: [] });
  });
  it('preserves the fixed invoice amount over customer tariffs and never fabricates an hour', () => {
    expect(assignmentInvoiceLines({ ...assignment, cost: 750 }, customer, [], new Map())[0]).toMatchObject({ quantity: 1, unitPrice: 750, amount: 750 });
    const missingTime = assignmentInvoiceLines({ ...assignment, actual_stop: null }, customer, [], new Map());
    expect(missingTime[0].quantity).toBe(0);
    expect(invoiceLinesError(missingTime, missingTime, ['a1'], false)).toContain('antal');
  });
  it('keeps every source article even when two rows reference the same catalog article', () => {
    const lines = assignmentInvoiceLines(assignment, customer, [article, { ...article, id: 'source2' }], new Map([['article1', 250]]));
    expect(lines).toHaveLength(2);
    expect(new Set(lines.map(line => line.id)).size).toBe(2);
    expect(lines[0]).toMatchObject({ assignmentId: 'a1', articleId: 'article1', unitPrice: 250, source: 'article' });
    expect(missingInvoiceSources(lines.slice(0, 1), lines)).toEqual([lines[1]]);
    expect(invoiceLinesError(lines.slice(0, 1), lines, ['a1'], false)).toContain('Uppdragsrader saknas');
    expect(assignmentInvoiceLines(assignment, customer, [{ ...article, article_id: null }], new Map())[0].unitPrice).toBe(300);
  });
  it('rejects missing selected sources and source rows from an unselected assignment', () => {
    const lines = baseLines();
    expect(invoiceLinesError(lines, lines, ['a1', 'a2'], false)).toContain('Uppdragsrader saknas');
    expect(invoiceLinesError(lines, [], [], false)).toContain('inte är valt');
  });
  it('requires explicit zero-price review, permits free rows and drafts, but never sends a zero-total invoice', () => {
    const zero = baseLines().map(line => ({ ...line, unitPrice: 0, amount: 0 }));
    expect(invoiceLinesError(zero, zero, ['a1'], false)).toContain('nollpris');
    expect(invoiceLinesError(zero, zero, ['a1'], true, 'draft')).toBeNull();
    expect(invoiceLinesError(zero, zero, ['a1'], true, 'sent')).toContain('över 0');
    const mixed = [...baseLines(), { ...zero[0], id: 'manual', assignmentId: null, source: 'manual' as const }];
    expect(invoiceLinesError(mixed, baseLines(), ['a1'], true, 'sent')).toBeNull();
  });
  it('rejects non-finite prices, quantities and totals rather than persisting a corrupt invoice', () => {
    for (const patch of [{ unitPrice: NaN }, { quantity: Infinity }, { vatRate: NaN }, { unitPrice: -1 }]) {
      expect(invoiceLinesError(baseLines().map(line => ({ ...line, ...patch })), baseLines(), ['a1'], true)).not.toBeNull();
    }
    const huge = baseLines().map(line => ({ ...line, quantity: 1e300, unitPrice: 1e300 }));
    expect(invoiceLinesError(huge, huge, ['a1'], true)).toContain('totalsumma');
  });
});
