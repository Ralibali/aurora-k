import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssignments, useDrivers, useCustomers } from '@/hooks/useData';
import { formatSwedishDate, formatSwedishTime, calculateDecimalHours } from '@/lib/format';
import { FileText, FileSpreadsheet, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminReports() {
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();

  const completedAssignments = (assignments ?? []).filter(a => {
    if (a.status !== 'completed' || !a.actual_start || !a.actual_stop) return false;
    if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
    if (customerFilter !== 'all' && a.customer_id !== customerFilter) return false;
    return true;
  });

  const totalHours = completedAssignments.reduce((sum, a) => {
    if (!a.actual_start || !a.actual_stop) return sum;
    return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
  }, 0);

  return (
    <AdminLayout title="Tidrapporter & Export">
      <div className="space-y-4 max-w-5xl">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Chaufför</Label>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alla" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla chaufförer</SelectItem>
                {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kund</Label>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alla" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kunder</SelectItem>
                {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Från</Label>
            <Input type="date" className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Till</Label>
            <Input type="date" className="w-[160px]" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('PDF-export kommer snart')}>
            <FileText className="h-4 w-4 mr-1" /> Exportera PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Excel-export kommer snart')}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportera Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Faktureringsunderlag kommer snart')}>
            <Receipt className="h-4 w-4 mr-1" /> Faktureringsunderlag
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chaufför</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Kund</TableHead>
                  <TableHead>Uppdrag</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Stopp</TableHead>
                  <TableHead className="text-right">Timmar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [1, 2, 3].map(i => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && completedAssignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Inga slutförda uppdrag för vald period
                    </TableCell>
                  </TableRow>
                )}
                {completedAssignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.driver?.full_name}</TableCell>
                    <TableCell>{formatSwedishDate(a.actual_start!)}</TableCell>
                    <TableCell>{a.customer?.name}</TableCell>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>{formatSwedishTime(a.actual_start!)}</TableCell>
                    <TableCell>{formatSwedishTime(a.actual_stop!)}</TableCell>
                    <TableCell className="text-right">
                      {calculateDecimalHours(a.actual_start!, a.actual_stop!)}h
                    </TableCell>
                  </TableRow>
                ))}
                {completedAssignments.length > 0 && (
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell colSpan={6}>Totalt</TableCell>
                    <TableCell className="text-right">{totalHours}h</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
