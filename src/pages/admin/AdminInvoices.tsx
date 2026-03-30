import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useInvoices, useCustomers, useUpdateInvoiceStatus, useAssignments, useSettings } from '@/hooks/useData';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { generateSieFile, generateFortnoxCsv, generateVismaCsv, generateAccountingExcel, downloadTextFile } from '@/lib/accounting-export';
import { calculateDecimalHours } from '@/lib/format';
import { Plus, Download, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AdminInvoices() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const { data: invoices, isLoading } = useInvoices();
  const { data: customers } = useCustomers();
  const { data: allAssignments } = useAssignments();
  const { data: settings } = useSettings();
  const updateStatus = useUpdateInvoiceStatus();

  const now = new Date().toISOString().split('T')[0];
  const processedInvoices = (invoices ?? []).map(i => ({
    ...i,
    status: i.status === 'sent' && i.due_date < now ? 'overdue' : i.status,
  }));

  const filtered = processedInvoices.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (customerFilter !== 'all' && i.customer_id !== customerFilter) return false;
    return true;
  });

  const handleDownloadPdf = (inv: typeof processedInvoices[0]) => {
    const customer = inv.customer;
    if (!customer || !settings) {
      toast.error('Företagsinställningar saknas – fyll i under Inställningar');
      return;
    }

    const invoiceAssignments = (allAssignments ?? []).filter(a =>
      inv.assignment_ids.includes(a.id)
    );

    const lines = invoiceAssignments.map(a => {
      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
      const unitPrice = customer.pricing_type === 'per_delivery' ? (customer.price_per_delivery || 0) : (customer.price_per_hour || 0);
      const amount = customer.pricing_type === 'per_delivery' ? unitPrice : hours * unitPrice;
      return {
        date: a.actual_start,
        description: a.title,
        driver: a.driver?.full_name || '',
        hours,
        unitPrice,
        amount,
      };
    });

    const doc = generateInvoicePdf({
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      reference: inv.reference,
      message: inv.message,
      customer: {
        name: customer.name,
        org_number: customer.org_number,
        invoice_address: customer.invoice_address,
      },
      company: {
        company_name: settings.company_name,
        org_number: settings.org_number,
        address: settings.address,
        zip_city: settings.zip_city,
        email: settings.email,
        phone: settings.phone,
        bankgiro: settings.bankgiro,
        plusgiro: settings.plusgiro,
        vat_number: settings.vat_number,
      },
      lines,
      totalExVat: inv.total_ex_vat,
      vatAmount: inv.vat_amount,
      totalIncVat: inv.total_inc_vat,
    });

    doc.save(`Faktura-${inv.invoice_number}.pdf`);
  };

  return (
    <AdminLayout title="Fakturering">
      <div className="space-y-4 max-w-6xl">
        <div className="flex flex-wrap gap-3">
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
          <div className="flex-1" />
          <Button asChild>
            <Link to="/admin/invoices/new"><Plus className="h-4 w-4 mr-1" /> Skapa faktura</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fakturanr</TableHead>
                  <TableHead>Kund</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Förfallodatum</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]">Åtgärd</TableHead>
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
                    <TableCell className="font-medium">#{inv.invoice_number}</TableCell>
                    <TableCell>{inv.customer?.name}</TableCell>
                    <TableCell>{inv.invoice_date}</TableCell>
                    <TableCell>{inv.due_date}</TableCell>
                    <TableCell className="text-right">{inv.total_inc_vat.toFixed(0)} kr</TableCell>
                    <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
