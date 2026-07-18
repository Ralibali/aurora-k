import { calculateDecimalHours } from '@/lib/format';
import { normalizeInvoiceLines, toInvoicePdfLines, type PersistedInvoiceLine } from '@/lib/invoice-lines';

export type InvoiceDocumentLine = PersistedInvoiceLine;

export type InvoiceAssignment = {
  id: string;
  title: string;
  actual_start?: string | null;
  actual_stop?: string | null;
  driver?: { full_name?: string | null } | null;
};

export type InvoiceCompanySettings = {
  company_name: string;
  org_number: string | null;
  address: string | null;
  zip_city: string | null;
  email: string | null;
  phone: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  vat_number: string | null;
};

export function getInvoiceDocumentLines(
  invoice: Record<string, unknown>,
  assignments: InvoiceAssignment[],
): InvoiceDocumentLine[] {
  const stored = normalizeInvoiceLines(invoice.lines);
  if (stored.length) return stored;

  const customer = (invoice.customer ?? {}) as Record<string, unknown>;
  const assignmentIds = Array.isArray(invoice.assignment_ids) ? invoice.assignment_ids.map(String) : [];

  return assignments
    .filter(item => assignmentIds.includes(item.id))
    .map(item => {
      const hours = item.actual_start && item.actual_stop
        ? calculateDecimalHours(item.actual_start, item.actual_stop)
        : 0;
      const perDelivery = customer.pricing_type === 'per_delivery';
      const quantity = perDelivery ? 1 : hours;
      const unitPrice = Number(perDelivery ? customer.price_per_delivery : customer.price_per_hour) || 0;

      return {
        id: `legacy-${item.id}`,
        description: item.title,
        quantity,
        unit: perDelivery ? 'st' : 'h',
        unitPrice,
        vatRate: Number(invoice.total_ex_vat) > 0
          ? Math.round((Number(invoice.vat_amount) / Number(invoice.total_ex_vat)) * 100)
          : 0,
        amount: quantity * unitPrice,
        date: item.actual_start,
        driver: item.driver?.full_name ?? '',
        assignmentId: item.id,
        source: 'assignment' as const,
      };
    });
}

export function buildInvoicePdfData(
  invoice: Record<string, unknown>,
  assignments: InvoiceAssignment[],
  settings: InvoiceCompanySettings,
) {
  const customer = (invoice.customer ?? {}) as Record<string, unknown>;
  const totalExVat = Number(invoice.total_ex_vat ?? 0);
  const vatAmount = Number(invoice.vat_amount ?? 0);
  const lines = getInvoiceDocumentLines(invoice, assignments);

  return {
    invoiceNumber: Number(invoice.invoice_number),
    invoiceDate: String(invoice.invoice_date ?? ''),
    dueDate: String(invoice.due_date ?? ''),
    reference: invoice.reference ? String(invoice.reference) : null,
    message: invoice.message ? String(invoice.message) : null,
    customer: {
      name: String(customer.name ?? ''),
      org_number: customer.org_number ? String(customer.org_number) : null,
      invoice_address: customer.invoice_address ? String(customer.invoice_address) : null,
    },
    company: settings,
    lines: toInvoicePdfLines(lines),
    totalExVat,
    vatAmount,
    totalIncVat: Number(invoice.total_inc_vat ?? totalExVat + vatAmount),
    vatRate: totalExVat > 0 ? Math.round((vatAmount / totalExVat) * 100) : 0,
  };
}
