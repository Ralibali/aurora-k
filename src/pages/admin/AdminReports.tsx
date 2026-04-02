import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssignments, useDrivers, useCustomers, useDriverCompensations } from '@/hooks/useData';
import { formatSwedishDate, formatSwedishTime, calculateDecimalHours } from '@/lib/format';
import { FileText, FileSpreadsheet, Receipt, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminReports() {
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();
  const { data: compensations } = useDriverCompensations();

  const completedAssignments = (assignments ?? []).filter(a => {
    if (a.status !== 'completed' || !a.actual_start || !a.actual_stop) return false;
    if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
    if (customerFilter !== 'all' && a.customer_id !== customerFilter) return false;
    if (fromDate && a.actual_start < fromDate) return false;
    if (toDate && a.actual_start > toDate + 'T23:59:59') return false;
    return true;
  });

  const totalHours = completedAssignments.reduce((sum, a) => {
    if (!a.actual_start || !a.actual_stop) return sum;
    return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
  }, 0);

  const buildRows = (items: typeof completedAssignments) =>
    items.map(a => ({
      driver: a.driver?.full_name || '',
      date: formatSwedishDate(a.actual_start!),
      customer: a.customer?.name || '',
      title: a.title,
      start: formatSwedishTime(a.actual_start!),
      stop: formatSwedishTime(a.actual_stop!),
      hours: calculateDecimalHours(a.actual_start!, a.actual_stop!),
    }));

  const dateStr = () => new Date().toISOString().split('T')[0];

  const dateRangeLabel = () => {
    if (fromDate && toDate) return `${fromDate} – ${toDate}`;
    if (fromDate) return `från ${fromDate}`;
    if (toDate) return `till ${toDate}`;
    return 'Alla datum';
  };

  const handleExportPdf = () => {
    const rows = buildRows(completedAssignments);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tidrapport', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 28;
    doc.text(dateRangeLabel(), 20, y);
    if (driverFilter !== 'all') {
      const driverName = (drivers ?? []).find(d => d.id === driverFilter)?.full_name || '';
      y += 5;
      doc.text(`Chaufför: ${driverName}`, 20, y);
    }

    autoTable(doc, {
      startY: y + 8,
      head: [['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar']],
      body: rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, `${r.hours}h`]),
      foot: [['', '', '', '', '', 'Totalt', `${totalHours}h`]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
      footStyles: { fillColor: [245, 247, 250], textColor: [30, 30, 30], fontStyle: 'bold' },
    });

    doc.save(`tidrapport_${dateStr()}.pdf`);
    toast.success('PDF exporterad');
  };

  const handleExportExcel = () => {
    const rows = buildRows(completedAssignments);
    const wsData = [
      ['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar'],
      ...rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, r.hours]),
      ['', '', '', '', '', 'Totalt', totalHours],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tidrapport');
    XLSX.writeFile(wb, `tidrapport_${dateStr()}.xlsx`);
    toast.success('Excel exporterad');
  };

  const handleInvoiceBasis = () => {
    if (customerFilter === 'all') {
      toast.error('Välj en kund först för att skapa faktureringsunderlag');
      return;
    }
    const customer = (customers ?? []).find(c => c.id === customerFilter);
    if (!customer) return;

    const rows = buildRows(completedAssignments);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Faktureringsunderlag', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 20, 28);
    doc.text(dateRangeLabel(), 20, 33);

    autoTable(doc, {
      startY: 40,
      head: [['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar']],
      body: rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, `${r.hours}h`]),
      foot: [['', '', '', '', '', 'Totalt', `${totalHours}h`]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
      footStyles: { fillColor: [245, 247, 250], textColor: [30, 30, 30], fontStyle: 'bold' },
    });

    const safeName = customer.name.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '_');
    doc.save(`faktureringsunderlag_${safeName}_${dateStr()}.pdf`);
    toast.success('Faktureringsunderlag exporterat');
  };

  const handleSalaryReport = () => {
    const compMap = Object.fromEntries((compensations ?? []).map(c => [c.driver_id, c]));
    const driverIds = [...new Set(completedAssignments.map(a => a.assigned_driver_id))];

    const salaryRows = driverIds.map(dId => {
      const driver = (drivers ?? []).find(d => d.id === dId);
      const comp = compMap[dId];
      const driverAssignments = completedAssignments.filter(a => a.assigned_driver_id === dId);
      const totalH = driverAssignments.reduce((sum, a) => sum + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
      const count = driverAssignments.length;

      let grossPay = 0;
      let payType = 'Ej angiven';
      if (comp) {
        switch (comp.compensation_type) {
          case 'hourly':
            grossPay = totalH * Number(comp.hourly_rate);
            payType = `${Number(comp.hourly_rate).toFixed(0)} kr/h`;
            break;
          case 'per_assignment':
            grossPay = count * Number(comp.per_assignment_rate);
            payType = `${Number(comp.per_assignment_rate).toFixed(0)} kr/uppdrag`;
            break;
          case 'monthly':
            grossPay = Number(comp.monthly_salary);
            payType = `${Number(comp.monthly_salary).toFixed(0)} kr/mån`;
            break;
        }
      }

      return {
        name: driver?.full_name ?? 'Okänd',
        type: payType,
        hours: totalH,
        assignments: count,
        grossPay,
        taxTable: comp?.tax_table ?? '',
      };
    });

    // Export as Excel
    const wsData = [
      ['Lönerapport', dateRangeLabel()],
      [],
      ['Chaufför', 'Ersättningstyp', 'Timmar', 'Uppdrag', 'Bruttolön (kr)', 'Skattetabell'],
      ...salaryRows.map(r => [r.name, r.type, r.hours.toFixed(1), r.assignments, r.grossPay.toFixed(0), r.taxTable]),
      [],
      ['', '', '', 'Totalt', salaryRows.reduce((s, r) => s + r.grossPay, 0).toFixed(0), ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lönerapport');
    XLSX.writeFile(wb, `lonerapport_${dateStr()}.xlsx`);
    toast.success('Lönerapport exporterad');
  };


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
            <Input type="date" className="w-[160px]" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Till</Label>
            <Input type="date" className="w-[160px]" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileText className="h-4 w-4 mr-1" /> Exportera PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportera Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleInvoiceBasis}>
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
