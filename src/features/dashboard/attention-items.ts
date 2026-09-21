import { invoiceReadiness, type InvoiceBasisAssignment } from '@/lib/invoice-readiness';
import { getStockholmDateKey, matchesDispatchFilter, type DispatchAssignment } from '@/features/dispatch/dispatch-utils';

export type AttentionItem = {
  id: string;
  tone: 'red' | 'amber' | 'green';
  title: string;
  description: string;
  count: number;
  href: string;
  action: string;
};

type Assignment = DispatchAssignment & { invoiced?: boolean | null; cost?: number | null; actual_stop?: string | null; customer?: (Partial<NonNullable<InvoiceBasisAssignment['customer']>> & { name?: string | null }) | null };
type Invoice = Record<string, unknown>;

export function buildAttentionItems(assignments: Assignment[], invoices: Invoice[], now = new Date(), options: { openDeviations?: readonly { assignment_id: string }[]; deviationsAvailable?: boolean } = {}): AttentionItem[] {
  const today = getStockholmDateKey(now);
  const unassigned = assignments.filter(item => matchesDispatchFilter(item, 'unassigned', now));
  const late = assignments.filter(item => matchesDispatchFilter(item, 'overdue', now));
  const delayed = assignments.filter(item => matchesDispatchFilter(item, 'delayed', now));
  const missingProof = assignments.filter(item => matchesDispatchFilter(item, 'proof', now));
  const openCounts = new Map<string, number>();
  for (const deviation of options.openDeviations ?? []) openCounts.set(deviation.assignment_id, (openCounts.get(deviation.assignment_id) ?? 0) + 1);
  const completed = assignments.filter(item => item.status === 'completed' && !item.invoiced);
  const invoiceReady = completed.filter(item => invoiceReadiness({
    ...item, invoiced: Boolean(item.invoiced), actual_start: item.actual_start ?? null, actual_stop: item.actual_stop ?? null,
    customer: item.customer ? { pricing_type: item.customer.pricing_type ?? null, price_per_delivery: item.customer.price_per_delivery ?? null, price_per_hour: item.customer.price_per_hour ?? null } : null,
  }, openCounts.get(item.id) ?? 0, options.deviationsAvailable === true).ready);
  const needsReview = completed.length - invoiceReady.length;
  const overdue = invoices.filter(item => item.status === 'overdue' || (item.status === 'sent' && String(item.due_date) < today));

  const result: AttentionItem[] = [];
  if (late.length) result.push({ id: 'late', tone: 'red', title: 'Uppdrag har inte startat', description: 'Starttiden har passerat med mer än 15 minuter.', count: late.length, href: '/admin/assignments?filter=overdue&date=all', action: 'Kontrollera' });
  if (delayed.length) result.push({ id: 'delayed', tone: 'red', title: 'Försenade transporter', description: 'Kundkontakt eller omplanering kan behövas.', count: delayed.length, href: '/admin/assignments?filter=delayed&date=all', action: 'Hantera' });
  if (overdue.length) result.push({ id: 'overdue', tone: 'red', title: 'Förfallna fakturor', description: 'Betalningar har passerat förfallodatum.', count: overdue.length, href: '/admin/invoices', action: 'Öppna' });
  if (unassigned.length) result.push({ id: 'unassigned', tone: 'amber', title: 'Saknar chaufför', description: 'Planerade uppdrag behöver tilldelas.', count: unassigned.length, href: '/admin/assignments?filter=unassigned&date=all', action: 'Tilldela' });
  if (missingProof.length) result.push({ id: 'proof', tone: 'amber', title: 'Leveransbevis saknas', description: 'Obligatoriskt foto eller signatur saknas.', count: missingProof.length, href: '/admin/assignments?filter=proof&date=all', action: 'Granska' });
  if (needsReview) result.push({ id: 'invoice-review', tone: 'amber', title: 'Fakturaunderlag behöver granskas', description: 'Kontrollera pris, tider, leveransbevis och öppna avvikelser.', count: needsReview, href: '/admin/invoice-basis', action: 'Granska underlag' });
  if (invoiceReady.length) result.push({ id: 'invoice-ready', tone: 'green', title: 'Redo att fakturera', description: 'Slutförda uppdrag har komplett underlag.', count: invoiceReady.length, href: '/admin/invoice-basis', action: 'Skapa underlag' });
  return result;
}
