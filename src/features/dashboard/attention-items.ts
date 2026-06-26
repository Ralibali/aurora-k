export type AttentionItem = {
  id: string;
  tone: 'red' | 'amber' | 'green';
  title: string;
  description: string;
  count: number;
  href: string;
  action: string;
};

type Assignment = Record<string, unknown>;
type Invoice = Record<string, unknown>;

export function buildAttentionItems(assignments: Assignment[], invoices: Invoice[], now = new Date()): AttentionItem[] {
  const threshold = now.getTime() - 15 * 60_000;
  const today = now.toISOString().slice(0, 10);
  const pending = assignments.filter(item => item.status === 'pending');
  const unassigned = pending.filter(item => !item.assigned_driver_id && new Date(String(item.scheduled_start)).getTime() >= threshold);
  const late = pending.filter(item => new Date(String(item.scheduled_start)).getTime() < threshold);
  const delayed = assignments.filter(item => item.status === 'delayed');
  const missingProof = assignments.filter(item => item.status === 'completed' && ((item.require_photo && !item.consignment_photo_url) || (item.require_signature && !item.signature_url)));
  const invoiceReady = assignments.filter(item => item.status === 'completed' && !item.invoiced && !(item.require_photo && !item.consignment_photo_url) && !(item.require_signature && !item.signature_url));
  const overdue = invoices.filter(item => item.status === 'overdue' || (item.status === 'sent' && String(item.due_date) < today));

  const result: AttentionItem[] = [];
  if (late.length) result.push({ id: 'late', tone: 'red', title: 'Uppdrag har inte startat', description: 'Starttiden har passerat med mer än 15 minuter.', count: late.length, href: '/admin/assignments', action: 'Kontrollera' });
  if (delayed.length) result.push({ id: 'delayed', tone: 'red', title: 'Försenade transporter', description: 'Kundkontakt eller omplanering kan behövas.', count: delayed.length, href: '/admin/assignments', action: 'Hantera' });
  if (overdue.length) result.push({ id: 'overdue', tone: 'red', title: 'Förfallna fakturor', description: 'Betalningar har passerat förfallodatum.', count: overdue.length, href: '/admin/invoices', action: 'Öppna' });
  if (unassigned.length) result.push({ id: 'unassigned', tone: 'amber', title: 'Saknar chaufför', description: 'Planerade uppdrag behöver tilldelas.', count: unassigned.length, href: '/admin/assignments', action: 'Tilldela' });
  if (missingProof.length) result.push({ id: 'proof', tone: 'amber', title: 'Leveransbevis saknas', description: 'Obligatoriskt foto eller signatur saknas.', count: missingProof.length, href: '/admin/assignments', action: 'Granska' });
  if (invoiceReady.length) result.push({ id: 'invoice-ready', tone: 'green', title: 'Redo att fakturera', description: 'Slutförda uppdrag har komplett underlag.', count: invoiceReady.length, href: '/admin/invoices/new', action: 'Fakturera' });
  return result;
}
