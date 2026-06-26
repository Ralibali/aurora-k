import { CalendarDays, FileText, MapPin, Receipt, Route, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PortalInvoiceDownloadButton } from '@/components/portal/PortalInvoiceDownloadButton';

type Assignment = {
  id: string;
  title: string;
  status: string;
  scheduled_start?: string;
  pickup_address?: string | null;
  delivery_address?: string | null;
  address?: string | null;
  service_type?: string | null;
};

type Order = {
  id: string;
  order_number: string;
  title: string;
  status: string;
};

type Invoice = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  total_inc_vat?: number;
  status: string;
  [key: string]: unknown;
};

const labels: Record<string, string> = {
  pending: 'Väntande',
  active: 'Aktiv',
  in_progress: 'Pågår',
  completed: 'Slutförd',
  cancelled: 'Avbruten',
  draft: 'Utkast',
  sent: 'Skickad',
  paid: 'Betald',
  overdue: 'Förfallen',
};

function badgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed' || status === 'paid') return 'secondary';
  if (status === 'cancelled' || status === 'overdue') return 'destructive';
  if (status === 'active' || status === 'in_progress' || status === 'sent') return 'default';
  return 'outline';
}

function routeText(assignment: Assignment) {
  if (assignment.pickup_address && assignment.delivery_address) return `${assignment.pickup_address} → ${assignment.delivery_address}`;
  return assignment.pickup_address || assignment.delivery_address || assignment.address || 'Adress saknas';
}

function dateTime(value?: string) {
  if (!value) return 'Inte planerat';
  return new Date(value).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

function EmptyCard({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500"><Icon className="mx-auto mb-3 h-8 w-8 opacity-35" /><p className="text-sm">{text}</p></div>;
}

export function PortalAssignmentsMobile({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) return <EmptyCard icon={Route} text="Inga uppdrag ännu" />;
  return (
    <div className="space-y-3">
      {assignments.map(assignment => (
        <article key={assignment.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-950">{assignment.title}</p>{assignment.service_type && <p className="mt-1 text-xs text-slate-500">{assignment.service_type}</p>}</div><Badge variant={badgeVariant(assignment.status)}>{labels[assignment.status] || assignment.status}</Badge></div>
          <div className="mt-4 space-y-2 text-sm text-slate-600"><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{routeText(assignment)}</span></p><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" />{dateTime(assignment.scheduled_start)}</p></div>
        </article>
      ))}
    </div>
  );
}

export function PortalOrdersMobile({ orders }: { orders: Order[] }) {
  if (!orders.length) return <EmptyCard icon={ShoppingCart} text="Inga beställningar ännu" />;
  return (
    <div className="space-y-3">
      {orders.map(order => (
        <article key={order.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-mono text-slate-500">#{order.order_number}</p><p className="mt-1 font-semibold text-slate-950">{order.title}</p></div><Badge variant={badgeVariant(order.status)}>{labels[order.status] || order.status}</Badge></div>
        </article>
      ))}
    </div>
  );
}

export function PortalInvoicesMobile({ invoices, assignments, settings, customer }: {
  invoices: Invoice[];
  assignments: Record<string, unknown>[];
  settings: Record<string, unknown> | null | undefined;
  customer: Record<string, unknown> | undefined;
}) {
  if (!invoices.length) return <EmptyCard icon={Receipt} text="Inga fakturor ännu" />;
  return (
    <div className="space-y-3">
      {invoices.map(invoice => (
        <article key={invoice.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Faktura</p><p className="text-lg font-bold text-slate-950">#{invoice.invoice_number}</p></div><Badge variant={badgeVariant(invoice.status)}>{labels[invoice.status] || invoice.status}</Badge></div>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div><p className="text-xs text-slate-500">Belopp</p><p className="font-semibold text-slate-950">{Number(invoice.total_inc_vat ?? 0).toLocaleString('sv-SE')} kr</p></div><div><p className="text-xs text-slate-500">Förfallodatum</p><p className="font-semibold text-slate-950">{invoice.due_date}</p></div></div>
          <div className="mt-3 flex justify-end"><PortalInvoiceDownloadButton invoice={{ ...invoice, customer }} assignments={assignments} settings={settings} /></div>
        </article>
      ))}
    </div>
  );
}
