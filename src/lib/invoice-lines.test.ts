import { describe, expect, it } from 'vitest';
import { invoiceLineTotals, normalizeInvoiceLines, toInvoicePdfLines } from '@/lib/invoice-lines';

describe('invoice lines', () => {
  it('calculates mixed VAT totals from the saved lines', () => {
    const totals = invoiceLineTotals([
      { id: '1', description: 'Transport', quantity: 2, unit: 'h', unitPrice: 800, vatRate: 25, amount: 1600, source: 'assignment' },
      { id: '2', description: 'Momsfri avgift', quantity: 1, unit: 'st', unitPrice: 100, vatRate: 0, amount: 100, source: 'manual' },
    ]);

    expect(totals.totalExVat).toBe(1700);
    expect(totals.vatAmount).toBe(400);
    expect(totals.totalIncVat).toBe(2100);
  });

  it('normalizes persisted snake_case rows', () => {
    const rows = normalizeInvoiceLines([
      { id: 'a', name: 'Budleverans', quantity: '2', unit: 'st', unit_price: '450', vat_rate: '25', source: 'article' },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ description: 'Budleverans', quantity: 2, unitPrice: 450, vatRate: 25, amount: 900 });
  });

  it('uses the exact persisted rows for PDF data', () => {
    const rows = toInvoicePdfLines([
      { id: 'x', description: 'Manuell justering', quantity: 3, unit: 'mil', unitPrice: 50, vatRate: 25, amount: 150, driver: 'Anna', source: 'manual' },
    ]);

    expect(rows[0]).toMatchObject({ description: 'Manuell justering (3 mil)', driver: 'Anna', hours: 3, unitPrice: 50, amount: 150 });
  });
});
