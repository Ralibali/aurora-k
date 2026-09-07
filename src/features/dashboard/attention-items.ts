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

type Assignment = DispatchAssignment & { invoiced?: boolean | null };
type Invoice = Record<string, unknown>;

export function buildAttentionItems(assignments: Assignment[], invoices: Invoice[], now = new Date()): AttentionItem[] {
  const today = getStockholmDateKey(now);
  const unassigned = assignments.filter(item => matchesDispatchFilter(item, 'unassigned', now));
  const late = assignments.filter(item => matchesDispatchFilter(item, 'overdue', now));
  const delayed = assignments.filter(item => matchesDispatchFilter(item, 'delayed', now));
  const missingProof = assignments.filter(item => matchesDispatchFilter(item, 'proof', now));
  const invoiceReady = assignments.filter(item => item.status === 'completed' && !item.invoiced && !matchesDispatchFilter(item, 'proof', now));
  const overdue = invoices.filter(item => item.status === 'overdue' || (item.status === 'sent' && String(item.due_date) < today));

  const result: AttentionItem[] = [];
  if (late.length) result.push({ id: 'late', tone: 'red', title: 'Uppdrag har inte startat', description: 'Starttiden har passerat med mer än 15 minuter.', count: late.length, href: '/admin/assignments?filter=overdue&date=all', action: 'Kontrollera' });
  if (delayed.length) result.push({ id: 'delayed', tone: 'red', title: 'Försenade transporter', description: 'Kundkontakt eller omplanering kan behövas.', count: delayed.length, href: '/admin/assignments?filter=delayed&date=all', action: 'Hantera' });
  if (overdue.length) result.push({ id: 'overdue', tone: 'red', title: 'Förfallna fakturor', description: 'Betalningar har passerat förfallodatum.', count: overdue.length, href: '/admin/invoices', action: 'Öppna' });
  if (unassigned.length) result.push({ id: 'unassigned', tone: 'amber', title: 'Saknar chaufför', description: 'Planerade uppdrag behöver tilldelas.', count: unassigned.length, href: '/admin/assignments?filter=unassigned&date=all', action: 'Tilldela' });
  if (missingProof.length) result.push({ id: 'proof', tone: 'amber', title: 'Leveransbevis saknas', description: 'Obligatoriskt foto eller signatur saknas.', count: missingProof.length, href: '/admin/assignments?filter=proof&date=all', action: 'Granska' });
  if (invoiceReady.length) result.push({ id: 'invoice-ready', tone: 'green', title: 'Redo att fakturera', description: 'Slutförda uppdrag har komplett underlag.', count: invoiceReady.length, href: '/admin/invoices/new', action: 'Fakturera' });
  return result;
}
