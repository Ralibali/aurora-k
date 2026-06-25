import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useAssignments, useCustomers, useInvoices, useSettings, useUpdateInvoiceStatus } from '@/hooks/useData';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { buildInvoicePdfData, getInvoiceDocumentLines } from '@/features/invoicing/invoice-document';
import { InvoicePreviewDialog } from '@/features/invoicing/InvoicePreviewDialog';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoInvoices } from '@/lib/demo-data';

type InvoiceRecord = Record<string, any>;

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<InvoiceRecord | null>(null);
  const { data: invoices, isLoading } = useInvoices();
  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const { data: settings } = useSettings();
  const updateStatus = useUpdateInvoiceStatus();
  const { enabled: demoEnabled } = useDemoMode();
  const showingDemo = demoEnabled && (invoices?.length ?? 0) === 0;
  const source = showingDemo ? demoInvoices as InvoiceRecord[] : (invoices ?? []) as InvoiceRecord[];
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => source
    .map(invoice => ({ ...invoice, status: invoice.status === 'sent' && invoice.due_date < today ? 'overdue' : invoice.status }))
    .filter(invoice => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
      if (customerFilter !== 'all' && invoice.customer_id !== customerFilter) return false;
      if (!search) return true;
      const query = search.toLowerCase();
      return String(invoice.invoice_number).includes(query) || invoice.customer?.name?.toLowerCase().includes(query);
    }), [customerFilter, search, source, statusFilter, today]);

  const downloadPdf = (invoice: InvoiceRecord) => {
    if (!settings) return toast.error('Företagsinställningar saknas');
    generateInvoicePdf(buildInvoicePdfData(invoice, assignments ?? [], settings)).save(`Faktura-${invoice.invoice_number}.pdf`);
  };

  return (
    <AdminLayout title="Fakturering" description="Skapa och hantera fakturor">
      <div className="max-w-6xl space-y-5">
        {showingDemo && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">Demo-läge — statusändringar är avstängda.</div>}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[210px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Sök fakturanr eller kund" value={search} onChange={event => setSearch(event.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alla statusar</SelectItem><SelectItem value="draft">Utkast</SelectItem><SelectItem value="sent">Skickad</SelectItem><SelectItem value="paid">Betald</SelectItem><SelectItem value="overdue">Förfallen</SelectItem></SelectContent></Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alla kunder</SelectItem>{(customers ?? []).map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select>
          <Button asChild><Link to="/admin/invoices/new"><Plus className="mr-1 h-4 w-4" /> Skapa faktura</Link></Button>
        </div>
        <div className="rounded-xl border bg-card">
          <Table><TableHeader><TableRow><TableHead>Fakturanr</TableHead><TableHead>Kund</TableHead><TableHead>Datum</TableHead><TableHead>Förfallodatum</TableHead><TableHead className="text-right">Belopp</TableHead><TableHead>Status</TableHead><TableHead className="w-[190px]">Åtgärd</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && [1,2,3].map(item => <TableRow key={item}>{Array.from({ length: 7 }).map((_, index) => <TableCell key={index}><Skeleton className="h-4 w-20" /></TableCell>)}</TableRow>)}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Inga fakturor</TableCell></TableRow>}
              {!isLoading && filtered.map(invoice => <TableRow key={invoice.id}>
                <TableCell className="font-mono">#{invoice.invoice_number}</TableCell><TableCell>{invoice.customer?.name}</TableCell><TableCell>{invoice.invoice_date}</TableCell><TableCell>{invoice.due_date}</TableCell><TableCell className="text-right font-mono">{Number(invoice.total_inc_vat).toLocaleString('sv-SE')} kr</TableCell><TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setPreview(invoice)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => downloadPdf(invoice)}><Download className="h-4 w-4" /></Button>{invoice.status === 'draft' && <Button variant="ghost" size="sm" disabled={showingDemo} onClick={() => updateStatus.mutate({ id: invoice.id, status: 'sent' })}>Skicka</Button>}{['sent','overdue'].includes(invoice.status) && <Button variant="ghost" size="sm" disabled={showingDemo} onClick={() => updateStatus.mutate({ id: invoice.id, status: 'paid' })}>Betald</Button>}</div></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
        <InvoicePreviewDialog invoice={preview} lines={preview ? getInvoiceDocumentLines(preview, assignments ?? []) : []} settings={settings} onClose={() => setPreview(null)} onDownload={() => preview && downloadPdf(preview)} />
      </div>
    </AdminLayout>
  );
}
