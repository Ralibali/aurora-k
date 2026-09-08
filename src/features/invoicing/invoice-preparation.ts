import { assignmentInvoicePricing, type InvoiceBasisAssignment } from '@/lib/invoice-readiness';
import { invoiceLineTotals, type PersistedInvoiceLine } from '@/lib/invoice-lines';

export type InvoiceSelection = { customerId: string; assignmentIds: string[] };

export function invoiceSelection(search: string, state: unknown): InvoiceSelection {
  const params = new URLSearchParams(search);
  const navigation = state && typeof state === 'object' ? state as Record<string, unknown> : {};
  const customer = params.has('customer') ? params.get('customer') : navigation.customerId;
  const ids = params.has('assignments') ? params.get('assignments')?.split(',') : navigation.assignmentIds;
  return {
    customerId: typeof customer === 'string' ? customer.trim() : '',
    assignmentIds: Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string').map(id => id.trim()).filter(Boolean))] : [],
  };
}

type Assignment = Omit<InvoiceBasisAssignment, 'customer'> & {
  id: string;
  title: string;
  driver?: { full_name: string } | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
};
type SourceArticle = {
  id: string;
  article_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
};

export function assignmentInvoiceLines(
  assignment: Assignment,
  customer: InvoiceBasisAssignment['customer'],
  sourceArticles: SourceArticle[],
  prices: Map<string, number>,
): PersistedInvoiceLine[] {
  const common = { date: assignment.actual_start, driver: assignment.driver?.full_name ?? '', assignmentId: assignment.id };
  if (sourceArticles.length) {
    return sourceArticles.map(article => {
      // Preserve the established precedence: customer tariff, catalog price,
      // then the stored assignment price if its catalog article was removed.
      const unitPrice = prices.get(article.article_id ?? '') ?? Number(article.unit_price);
      const quantity = Number(article.quantity);
      return {
        ...common, id: `assignment-article-${article.id}`, description: article.name,
        quantity, unit: article.unit, unitPrice, vatRate: Number(article.vat_rate),
        amount: quantity * unitPrice, articleId: article.article_id, source: 'article',
      };
    });
  }
  const pricing = assignmentInvoicePricing({ ...assignment, customer });
  const route = assignment.pickup_address && assignment.delivery_address
    ? ` (${assignment.pickup_address} → ${assignment.delivery_address})` : '';
  const unitPrice = pricing.unitPrice ?? 0;
  return [{
    ...common, id: `assignment-${assignment.id}`,
    description: `${assignment.title}${route}${pricing.source === 'per_delivery' ? ' — leverans' : ''}`,
    quantity: pricing.quantity, unit: pricing.unit, unitPrice, vatRate: 25,
    amount: pricing.quantity * unitPrice, source: 'assignment',
  }];
}

export function missingInvoiceSources(lines: PersistedInvoiceLine[], sources: PersistedInvoiceLine[]) {
  return sources.filter(source => !lines.some(line => line.id === source.id && line.assignmentId === source.assignmentId && line.articleId === source.articleId && line.source === source.source));
}

export function invoiceLinesError(
  lines: PersistedInvoiceLine[],
  sources: PersistedInvoiceLine[],
  selectedIds: string[],
  zeroPricesApproved: boolean,
  status: 'draft' | 'sent' = 'draft',
): string | null {
  if (!lines.length) return 'Fakturan måste innehålla minst en rad.';
  if (lines.some(line => !line.description.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || !Number.isFinite(line.vatRate) || line.vatRate < 0 || line.vatRate > 100)) {
    return 'Kontrollera beskrivning, antal, pris och moms på samtliga rader.';
  }
  if (selectedIds.some(id => !sources.some(line => line.assignmentId === id)) || missingInvoiceSources(lines, sources).length) {
    return 'Uppdragsrader saknas. Återställ raderna eller ta bort uppdraget i steg 1.';
  }
  if (lines.some(line => line.assignmentId && !selectedIds.includes(line.assignmentId))) return 'En fakturarad hör till ett uppdrag som inte är valt.';
  if (lines.some(line => line.unitPrice === 0) && !zeroPricesApproved) return 'Kontrollera och godkänn rader med nollpris innan du fortsätter.';
  const totals = invoiceLineTotals(lines);
  if (!Object.values(totals).every(Number.isFinite)) return 'Fakturans totalsumma är ogiltig.';
  if (status === 'sent' && totals.totalIncVat <= 0) return 'En skickad faktura måste ha en totalsumma över 0 kr.';
  return null;
}
