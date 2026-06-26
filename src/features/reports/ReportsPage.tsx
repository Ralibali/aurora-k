import { useMemo, useState } from 'react';
import { addMonths, addWeeks, endOfMonth, endOfWeek, format, getISOWeek, startOfMonth, startOfWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssignments, useCustomers, useDriverCompensations, useDrivers } from '@/hooks/useData';
import { useObRates, usePerDiemRates } from '@/hooks/useNewFeatures';
import { computeSalary, workedHours, type SalaryPeriodMode } from '@/lib/salary-calculation';
import { formatSwedishDate, formatSwedishTime } from '@/lib/format';

type AssignmentRecord = Record<string, any>;

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<SalaryPeriodMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [driverFilter, setDriverFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const { data: assignments } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();
  const { data: compensations } = useDriverCompensations();
  const { data: obRates } = useObRates();
  const { data: perDiemRates } = usePerDiemRates();

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const monthDate = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const periodStart = viewMode === 'week' ? weekStart : monthStart;
  const periodEnd = viewMode === 'week' ? weekEnd : monthEnd;

  const periodAssignments = useMemo(() => (assignments ?? [])
    .filter(item => {
      if (item.status !== 'completed' || !item.actual_start || !item.actual_stop) return false;
      const start = new Date(item.actual_start);
      if (start < periodStart || start > periodEnd) return false;
      if (driverFilter !== 'all' && item.assigned_driver_id !== driverFilter) return false;
      if (customerFilter !== 'all' && item.customer_id !== customerFilter) return false;
      return true;
    })
    .sort((a, b) => String(a.actual_start).localeCompare(String(b.actual_start))) as AssignmentRecord[],
  [assignments, customerFilter, driverFilter, periodEnd, periodStart]);

  const visibleDrivers = driverFilter === 'all' ? (drivers ?? []) : (drivers ?? []).filter(driver => driver.id === driverFilter);
  const visibleCompensations = driverFilter === 'all' ? (compensations ?? []) : (compensations ?? []).filter(item => item.driver_id === driverFilter);
  const salary = computeSalary(
    periodAssignments as any,
    visibleDrivers,
    visibleCompensations,
    obRates ?? [],
    perDiemRates ?? [],
    viewMode,
  );
  const totalHours = workedHours(periodAssignments as any);
  const periodLabel = viewMode === 'week'
    ? `Vecka ${getISOWeek(weekStart)}, ${format(weekStart, 'd MMM', { locale: sv })}–${format(weekEnd, 'd MMM yyyy', { locale: sv })}`
    : format(monthDate, 'MMMM yyyy', { locale: sv });

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const timeRows = periodAssignments.map(item => ({
      Chaufför: item.driver?.full_name ?? '',
      Datum: formatSwedishDate(item.actual_start),
      Kund: item.customer?.name ?? '',
      Uppdrag: item.title,
      Start: formatSwedishTime(item.actual_start),
      Stopp: formatSwedishTime(item.actual_stop),
      Timmar: workedHours([item] as any),
    }));
    const salaryRows = salary.rows.map(row => ({
      Chaufför: row.name,
      Ersättningstyp: row.payType,
      Timmar: Number(row.hours.toFixed(2)),
      Uppdrag: row.assignments,
      Grundlön: Number(row.grossPay.toFixed(2)),
      OB: Number(row.obTotal.toFixed(2)),
      Traktamente: Number(row.perDiemTot.toFixed(2)),
      Totalt: Number(row.total.toFixed(2)),
      Skattetabell: row.taxTable,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(timeRows), 'Tidrapport');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salaryRows), 'Löneunderlag');
    XLSX.writeFile(workbook, `rapporter-${format(periodStart, 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exporterad');
  };

  const exportPdf = () => {
    const document = new jsPDF({ unit: 'mm', format: 'a4' });
    document.setFontSize(16);
    document.text('Tid- och lönerapport', 20, 20);
    document.setFontSize(10);
    document.text(periodLabel, 20, 27);
    autoTable(document, {
      startY: 34,
      head: [['Chaufför', 'Datum', 'Uppdrag', 'Start', 'Stopp', 'Timmar']],
      body: periodAssignments.map(item => [
        item.driver?.full_name ?? '',
        formatSwedishDate(item.actual_start),
        item.title,
        formatSwedishTime(item.actual_start),
        formatSwedishTime(item.actual_stop),
        workedHours([item] as any).toFixed(2),
      ]),
      styles: { fontSize: 8 },
    });
    const y = (document as any).lastAutoTable?.finalY + 10 || 90;
    document.setFontSize(13);
    document.text('Löneunderlag', 20, y);
    autoTable(document, {
      startY: y + 5,
      head: [['Chaufför', 'Grundlön', 'OB', 'Traktamente', 'Totalt']],
      body: salary.rows.map(row => [row.name, `${Math.round(row.grossPay)} kr`, `${Math.round(row.obTotal)} kr`, `${Math.round(row.perDiemTot)} kr`, `${Math.round(row.total)} kr`]),
      styles: { fontSize: 8 },
    });
    document.save(`rapporter-${format(periodStart, 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exporterad');
  };

  return (
    <AdminLayout title="Tidrapporter" description="Korrekt tid, OB, traktamente och löneunderlag">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={viewMode} onValueChange={value => setViewMode(value as SalaryPeriodMode)}><TabsList><TabsTrigger value="week"><CalendarDays className="mr-1 h-4 w-4" /> Vecka</TabsTrigger><TabsTrigger value="month"><CalendarRange className="mr-1 h-4 w-4" /> Månad</TabsTrigger></TabsList></Tabs>
          <div className="flex items-center rounded-lg border bg-card"><button className="p-2" onClick={() => viewMode === 'week' ? setWeekOffset(value => value - 1) : setMonthOffset(value => value - 1)}><ChevronLeft className="h-4 w-4" /></button><span className="min-w-[190px] px-3 text-center text-sm font-medium capitalize">{periodLabel}</span><button className="p-2" onClick={() => viewMode === 'week' ? setWeekOffset(value => value + 1) : setMonthOffset(value => value + 1)}><ChevronRight className="h-4 w-4" /></button></div>
          <Select value={driverFilter} onValueChange={setDriverFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Chaufför" /></SelectTrigger><SelectContent><SelectItem value="all">Alla chaufförer</SelectItem>{(drivers ?? []).map(driver => <SelectItem key={driver.id} value={driver.id}>{driver.full_name}</SelectItem>)}</SelectContent></Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Kund" /></SelectTrigger><SelectContent><SelectItem value="all">Alla kunder</SelectItem>{(customers ?? []).map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select>
          <div className="ml-auto flex gap-2"><Button variant="outline" onClick={exportPdf}><FileText className="mr-1 h-4 w-4" /> PDF</Button><Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button></div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Arbetstid</p><p className="mt-1 text-2xl font-bold">{totalHours.toFixed(1)} h</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Grundlön</p><p className="mt-1 text-2xl font-bold">{Math.round(salary.totalGross).toLocaleString('sv-SE')} kr</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">OB</p><p className="mt-1 text-2xl font-bold">{Math.round(salary.totalOb).toLocaleString('sv-SE')} kr</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Traktamente</p><p className="mt-1 text-2xl font-bold">{Math.round(salary.totalPerDiem).toLocaleString('sv-SE')} kr</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Totalt löneunderlag</p><p className="mt-1 text-2xl font-bold">{Math.round(salary.grandTotal).toLocaleString('sv-SE')} kr</p></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-base">Löneunderlag per chaufför</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Chaufför</TableHead><TableHead>Ersättning</TableHead><TableHead className="text-right">Timmar</TableHead><TableHead className="text-right">Grundlön</TableHead><TableHead className="text-right">OB</TableHead><TableHead className="text-right">Traktamente</TableHead><TableHead className="text-right">Totalt</TableHead></TableRow></TableHeader><TableBody>{salary.rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Ingen lönedata för perioden</TableCell></TableRow>}{salary.rows.map(row => <TableRow key={row.driverId}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.payType}</TableCell><TableCell className="text-right">{row.hours.toFixed(2)}</TableCell><TableCell className="text-right">{Math.round(row.grossPay).toLocaleString('sv-SE')} kr</TableCell><TableCell className="text-right">{Math.round(row.obTotal).toLocaleString('sv-SE')} kr</TableCell><TableCell className="text-right">{Math.round(row.perDiemTot).toLocaleString('sv-SE')} kr</TableCell><TableCell className="text-right font-bold">{Math.round(row.total).toLocaleString('sv-SE')} kr</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Rapporterade uppdrag</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Chaufför</TableHead><TableHead>Kund</TableHead><TableHead>Uppdrag</TableHead><TableHead>Start–stopp</TableHead><TableHead className="text-right">Timmar</TableHead></TableRow></TableHeader><TableBody>{periodAssignments.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Inga slutförda uppdrag</TableCell></TableRow>}{periodAssignments.map(item => <TableRow key={item.id}><TableCell>{formatSwedishDate(item.actual_start)}</TableCell><TableCell>{item.driver?.full_name}</TableCell><TableCell>{item.customer?.name}</TableCell><TableCell>{item.title}</TableCell><TableCell>{formatSwedishTime(item.actual_start)}–{formatSwedishTime(item.actual_stop)}</TableCell><TableCell className="text-right">{workedHours([item] as any).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </div>
    </AdminLayout>
  );
}
