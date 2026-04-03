import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useInvoices, useCustomers, useUpdateInvoiceStatus, useAssignments, useSettings } from '@/hooks/useData';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { generateSieFile, generateFortnoxCsv, generateVismaCsv, generateAccountingExcel, downloadTextFile } from '@/lib/accounting-export';
import { calculateDecimalHours } from '@/lib/format';
import { Plus, Download, FileSpreadsheet, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

function useInvoicePdfData() {
  const { data: allAssignments } = useAssignments();
  const { data: settings } = useSettings();

  const buildPdfData = (inv: any) => {
    const customer = inv.customer;
    if (!customer || !settings) return null;

    const invoiceAssignments = (allAssignments ?? []).filter((a: any) =>
      inv.assignment_ids.includes(a.id)
    );

    const lines = invoiceAssignments.map((a: any) => {
      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
      const unitPrice = customer.pricing_type === 'per_delivery' ? (customer.price_per_delivery || 0) : (customer.price_per_hour || 0);
      const amount = customer.pricing_type === 'per_delivery' ? unitPrice : hours * unitPrice;
      return { date: a.actual_start, description: a.title, driver: a.driver?.full_name || '', hours, unitPrice, amount };
    });

    const vatRate = inv.total_ex_vat > 0 ? Math.round((inv.vat_amount / inv.total_ex_vat) * 100) : 0;

    return {
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      reference: inv.reference,
      message: inv.message,
      customer: { name: customer.name, org_number: customer.org_number, invoice_address: customer.invoice_address },
      company: {
        company_name: settings.company_name, org_number: settings.org_number,
        address: settings.address, zip_city: settings.zip_city,
        email: settings.email, phone: settings.phone,
        bankgiro: settings.bankgiro, plusgiro: settings.plusgiro, vat_number: settings.vat_number,
      },
      lines,
      totalExVat: inv.total_ex_vat,
      vatAmount: inv.vat_amount,
      totalIncVat: inv.total_inc_vat,
      vatRate,
    };
  };

  return { buildPdfData, settings };
}

export default function AdminInvoices() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);

  const { data: invoices, isLoading } = useInvoices();
  const { data: customers } = useCustomers();
  const { data: allAssignments } = useAssignments();
  const updateStatus = useUpdateInvoiceStatus();
  const { buildPdfData, settings } = useInvoicePdfData();

  const now = new Date().toISOString().split('T')[0];
  const processedInvoices = (invoices ?? []).map(i => ({
    ...i,
    status: i.status === 'sent' && i.due_date < now ? 'overdue' : i.status,
  }));

  const filtered = processedInvoices.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (customerFilter !== 'all' && i.customer_id !== customerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = String(i.invoice_number).includes(q);
      const matchCustomer = i.customer?.name?.toLowerCase().includes(q);
      if (!matchNum && !matchCustomer) return false;
    }
    return true;
  });

  const handleDownloadPdf = (inv: any) => {
    const pdfData = buildPdfData(inv);
    if (!pdfData) { toast.error('Företagsinställningar saknas'); return; }
    const doc = generateInvoicePdf(pdfData);
    doc.save(`Faktura-${inv.invoice_number}.pdf`);
  };

  const handlePreview = (inv: any) => {
    setPreviewInvoice(inv);
  };

  // Build preview data
  const previewData = previewInvoice ? (() => {
    const customer = previewInvoice.customer;
    const invoiceAssignments = (allAssignments ?? []).filter((a: any) =>
      previewInvoice.assignment_ids.includes(a.id)
    );
    const vatRate = previewInvoice.total_ex_vat > 0 ? Math.round((previewInvoice.vat_amount / previewInvoice.total_ex_vat) * 100) : 0;
    return { customer, invoiceAssignments, vatRate };
  })() : null;

  return (
    <AdminLayout title="Fakturering" description="Skapa, exportera och hantera fakturor">
      <div className="space-y-5 max-w-6xl">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök fakturanr eller kund..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="draft">Utkast</SelectItem>
              <SelectItem value="sent">Skickad</SelectItem>
              <SelectItem value="paid">Betald</SelectItem>
              <SelectItem value="overdue">Förfallen</SelectItem>
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Kund" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kunder</SelectItem>
              {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportera
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                if (!settings) { toast.error('Företagsinställningar saknas'); return; }
                const year = new Date().getFullYear();
                const content = generateSieFile(filtered, settings, year);
                downloadTextFile(content, `Bokföring-${year}.si`, 'text/plain', 'cp437');
                toast.success('SIE-fil exporterad');
              }}>SIE-fil (.si)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const content = generateFortnoxCsv(filtered);
                downloadTextFile(content, `Fortnox-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
                toast.success('Fortnox CSV exporterad');
              }}>Fortnox CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!settings) { toast.error('Företagsinställningar saknas'); return; }
                const content = generateVismaCsv(filtered, settings);
                downloadTextFile(content, `Visma-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
                toast.success('Visma CSV exporterad');
              }}>Visma-format</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!settings) { toast.error('Företagsinställningar saknas'); return; }
                generateAccountingExcel(filtered, settings);
                toast.success('Excel exporterad');
              }}>Excel med konteringar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link to="/admin/invoices/new"><Plus className="h-4 w-4 mr-1" /> Skapa faktura</Link>
          </Button>
        </div>

        <div className="admin-table-card">
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fakturanr</TableHead>
                  <TableHead>Kund</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Förfallodatum</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [1, 2].map(i => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Inga fakturor</TableCell></TableRow>
                )}
                {filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">#{inv.invoice_number}</TableCell>
                    <TableCell>{inv.customer?.name}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.invoice_date}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.due_date}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{inv.total_inc_vat.toFixed(0)} kr</TableCell>
                    <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Förhandsgranska" onClick={() => handlePreview(inv)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Ladda ner PDF" onClick={() => handleDownloadPdf(inv)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {inv.status === 'draft' && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: inv.id, status: 'sent' })}>Skicka</Button>
                        )}
                        {(inv.status === 'sent' || inv.status === 'overdue') && (
                          <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid' })}>Betald</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Faktura #{previewInvoice?.invoice_number}</DialogTitle>
            </DialogHeader>
            {previewData && (
              <div className="space-y-6 p-4 border rounded-lg bg-card">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-lg">{settings?.company_name}</p>
                    <p className="text-sm text-muted-foreground">{settings?.address}, {settings?.zip_city}</p>
                    <p className="text-sm text-muted-foreground">Org.nr: {settings?.org_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">FAKTURA</p>
                    <p className="text-sm font-mono">Nr: {previewInvoice.invoice_number}</p>
                    <p className="text-sm font-mono">Datum: {previewInvoice.invoice_date}</p>
                    <p className="text-sm font-mono">Förfaller: {previewInvoice.due_date}</p>
                    {previewInvoice.reference && <p className="text-sm">Ref: {previewInvoice.reference}</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Faktureras till</p>
                  <p className="font-medium">{previewData.customer?.name}</p>
                  {previewData.customer?.org_number && <p className="text-sm text-muted-foreground">Org.nr: {previewData.customer.org_number}</p>}
                  {previewData.customer?.invoice_address && <p className="text-sm text-muted-foreground">{previewData.customer.invoice_address}</p>}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beskrivning</TableHead>
                      <TableHead>Chaufför</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.invoiceAssignments.map((a: any) => {
                      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
                      const unitPrice = previewData.customer?.pricing_type === 'per_delivery' ? (previewData.customer.price_per_delivery || 0) : (previewData.customer?.price_per_hour || 0);
                      const amount = previewData.customer?.pricing_type === 'per_delivery' ? unitPrice : hours * unitPrice;
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.title}</TableCell>
                          <TableCell>{a.driver?.full_name}</TableCell>
                          <TableCell className="text-right">{amount.toFixed(0)} kr</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="text-right space-y-1 border-t pt-3">
                  <p>Netto: <span className="font-medium">{previewInvoice.total_ex_vat.toFixed(0)} kr</span></p>
                  {previewData.vatRate > 0 ? (
                    <p>Moms {previewData.vatRate}%: <span className="font-medium">{previewInvoice.vat_amount.toFixed(0)} kr</span></p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Momsfri faktura</p>
                  )}
                  <p className="text-lg font-bold">Att betala: {previewInvoice.total_inc_vat.toFixed(0)} kr</p>
                </div>

                {previewInvoice.message && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Meddelande</p>
                    <p className="text-sm">{previewInvoice.message}</p>
                  </div>
                )}

                {settings?.bankgiro && <p className="text-sm text-muted-foreground">Bankgiro: {settings.bankgiro}</p>}
                {settings?.plusgiro && <p className="text-sm text-muted-foreground">Plusgiro: {settings.plusgiro}</p>}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => handleDownloadPdf(previewInvoice)}>
                <Download className="h-4 w-4 mr-1" /> Ladda ner PDF
              </Button>
              <Button variant="ghost" onClick={() => setPreviewInvoice(null)}>Stäng</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
