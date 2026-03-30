import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useInvoices, useCustomers, useUpdateInvoiceStatus } from '@/hooks/useData';
import { Plus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminInvoices() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const { data: invoices, isLoading } = useInvoices();
  const { data: customers } = useCustomers();
  const updateStatus = useUpdateInvoiceStatus();

  // Auto-flag overdue
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
                  <TableHead className="w-[120px]">Åtgärd</TableHead>
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
                        <Button variant="ghost" size="icon" title="Visa PDF"><FileText className="h-4 w-4" /></Button>
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
