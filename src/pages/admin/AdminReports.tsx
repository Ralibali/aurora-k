import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssignments, useDrivers, useCustomers, useDriverCompensations } from '@/hooks/useData';
import { formatSwedishDate, formatSwedishTime, calculateDecimalHours } from '@/lib/format';
import { FileText, FileSpreadsheet, Receipt, Banknote, ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { startOfWeek, endOfWeek, addWeeks, format, getISOWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

const AVATAR_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export default function AdminReports() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();
  const { data: compensations } = useDriverCompensations();

  // Week range
  const currentMonday = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentSunday = endOfWeek(currentMonday, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentMonday, end: currentSunday });
  const weekNumber = getISOWeek(currentMonday);

  // Completed assignments for the full filter (used for exports)
  const allCompleted = useMemo(() =>
    (assignments ?? []).filter(a => {
      if (a.status !== 'completed' || !a.actual_start || !a.actual_stop) return false;
      if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
      if (customerFilter !== 'all' && a.customer_id !== customerFilter) return false;
      return true;
    }),
    [assignments, driverFilter, customerFilter]
  );

  // Assignments in the selected week
  const weekAssignments = useMemo(() =>
    allCompleted.filter(a => {
      const d = parseISO(a.actual_start!);
      return d >= currentMonday && d <= currentSunday;
    }),
    [allCompleted, currentMonday, currentSunday]
  );

  // Pending approvals count (assignments completed but not yet approved — simplified)
  const pendingApprovals = useMemo(() =>
    weekAssignments.filter(a => a.status === 'completed' && !a.invoiced).length,
    [weekAssignments]
  );

  // Build week grid data: driver → day → hours
  const weekGrid = useMemo(() => {
    const driverList = driverFilter !== 'all'
      ? (drivers ?? []).filter(d => d.id === driverFilter)
      : (drivers ?? []).filter(d => weekAssignments.some(a => a.assigned_driver_id === d.id));

    return driverList.map(driver => {
      const dayCells = weekDays.map(day => {
        const dayAssignments = weekAssignments.filter(a =>
          a.assigned_driver_id === driver.id && isSameDay(parseISO(a.actual_start!), day)
        );
        const hours = dayAssignments.reduce((s, a) => s + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
        const times = dayAssignments.map(a => `${formatSwedishTime(a.actual_start!)}–${formatSwedishTime(a.actual_stop!)}`);
        return { hours, times };
      });
      const total = dayCells.reduce((s, c) => s + c.hours, 0);
      return { driver, dayCells, total };
    });
  }, [drivers, weekAssignments, weekDays, driverFilter]);

  // Daily totals
  const dailyTotals = weekDays.map((_, i) => weekGrid.reduce((s, row) => s + row.dayCells[i].hours, 0));
  const grandTotal = weekGrid.reduce((s, row) => s + row.total, 0);

  // ── Export helpers (kept intact) ──
  const totalHours = allCompleted.reduce((sum, a) => sum + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
  const buildRows = (items: typeof allCompleted) =>
    items.map(a => ({
      driver: a.driver?.full_name || '', date: formatSwedishDate(a.actual_start!),
      customer: a.customer?.name || '', title: a.title,
      start: formatSwedishTime(a.actual_start!), stop: formatSwedishTime(a.actual_stop!),
      hours: calculateDecimalHours(a.actual_start!, a.actual_stop!),
    }));
  const dateStr = () => new Date().toISOString().split('T')[0];
  const dateRangeLabel = () => `Vecka ${weekNumber}, ${format(currentMonday, 'd MMM', { locale: sv })} – ${format(currentSunday, 'd MMM yyyy', { locale: sv })}`;

  const handleExportPdf = () => {
    const rows = buildRows(weekAssignments);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Tidrapport', 20, 20);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(dateRangeLabel(), 20, 28);
    autoTable(doc, {
      startY: 36,
      head: [['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar']],
      body: rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, `${r.hours}h`]),
      foot: [['', '', '', '', '', 'Totalt', `${rows.reduce((s, r) => s + r.hours, 0).toFixed(1)}h`]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [30, 58, 95] },
      footStyles: { fillColor: [245, 247, 250], textColor: [30, 30, 30], fontStyle: 'bold' },
    });
    doc.save(`tidrapport_v${weekNumber}_${dateStr()}.pdf`);
    toast.success('PDF exporterad');
  };

  const handleExportExcel = () => {
    const rows = buildRows(weekAssignments);
    const wsData = [
      ['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar'],
      ...rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, r.hours]),
      ['', '', '', '', '', 'Totalt', rows.reduce((s, r) => s + r.hours, 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tidrapport');
    XLSX.writeFile(wb, `tidrapport_v${weekNumber}_${dateStr()}.xlsx`);
    toast.success('Excel exporterad');
  };

  const handleInvoiceBasis = () => {
    if (customerFilter === 'all') { toast.error('Välj en kund först'); return; }
    const customer = (customers ?? []).find(c => c.id === customerFilter);
    if (!customer) return;
    const rows = buildRows(weekAssignments);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Faktureringsunderlag', 20, 20);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 20, 28); doc.text(dateRangeLabel(), 20, 33);
    autoTable(doc, {
      startY: 40,
      head: [['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar']],
      body: rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, `${r.hours}h`]),
      foot: [['', '', '', '', '', 'Totalt', `${rows.reduce((s, r) => s + r.hours, 0).toFixed(1)}h`]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [30, 58, 95] },
      footStyles: { fillColor: [245, 247, 250], textColor: [30, 30, 30], fontStyle: 'bold' },
    });
    const safeName = customer.name.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '_');
    doc.save(`faktureringsunderlag_${safeName}_v${weekNumber}.pdf`);
    toast.success('Faktureringsunderlag exporterat');
  };

  const handleSalaryReport = () => {
    const compMap = Object.fromEntries((compensations ?? []).map(c => [c.driver_id, c]));
    const driverIds = [...new Set(weekAssignments.map(a => a.assigned_driver_id))];
    const salaryRows = driverIds.map(dId => {
      const driver = (drivers ?? []).find(d => d.id === dId);
      const comp = compMap[dId];
      const driverAssignments = weekAssignments.filter(a => a.assigned_driver_id === dId);
      const totalH = driverAssignments.reduce((sum, a) => sum + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
      const count = driverAssignments.length;
      let grossPay = 0, payType = 'Ej angiven';
      if (comp) {
        switch (comp.compensation_type) {
          case 'hourly': grossPay = totalH * Number(comp.hourly_rate); payType = `${Number(comp.hourly_rate).toFixed(0)} kr/h`; break;
          case 'per_assignment': grossPay = count * Number(comp.per_assignment_rate); payType = `${Number(comp.per_assignment_rate).toFixed(0)} kr/uppdrag`; break;
          case 'monthly': grossPay = Number(comp.monthly_salary); payType = `${Number(comp.monthly_salary).toFixed(0)} kr/mån`; break;
        }
      }
      return { name: driver?.full_name ?? 'Okänd', type: payType, hours: totalH, assignments: count, grossPay, taxTable: comp?.tax_table ?? '' };
    });
    const wsData = [
      ['Lönerapport', dateRangeLabel()], [],
      ['Chaufför', 'Ersättningstyp', 'Timmar', 'Uppdrag', 'Bruttolön (kr)', 'Skattetabell'],
      ...salaryRows.map(r => [r.name, r.type, r.hours.toFixed(1), r.assignments, r.grossPay.toFixed(0), r.taxTable]),
      [], ['', '', '', 'Totalt', salaryRows.reduce((s, r) => s + r.grossPay, 0).toFixed(0), ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lönerapport');
    XLSX.writeFile(wb, `lonerapport_v${weekNumber}.xlsx`);
    toast.success('Lönerapport exporterad');
  };

  return (
    <AdminLayout title="Tidrapporter" description="Veckoöversikt och export">
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-foreground">Tidrapporter</h2>
            {/* Week navigator */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg">
              <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 hover:bg-secondary rounded-l-lg transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-medium whitespace-nowrap">Vecka {weekNumber}</span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-secondary rounded-r-lg transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Chaufför" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla chaufförer</SelectItem>
                {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Kund" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kunder</SelectItem>
                {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportPdf}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleInvoiceBasis}><Receipt className="h-4 w-4 mr-1" /> Faktura</Button>
            <Button variant="outline" size="sm" onClick={handleSalaryReport}><Banknote className="h-4 w-4 mr-1" /> Lön</Button>
          </div>
        </div>

        {/* Date range label */}
        <p className="text-sm text-muted-foreground capitalize">
          {format(currentMonday, 'd MMMM', { locale: sv })} – {format(currentSunday, 'd MMMM yyyy', { locale: sv })}
        </p>

        {/* Pending approvals banner */}
        {pendingApprovals > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {pendingApprovals} tidrapporter väntar på godkännande denna vecka
            </p>
          </div>
        )}

        {/* Week table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : weekGrid.length === 0 ? (
          <div className="bg-card rounded-lg border border-dashed border-border p-16 text-center shadow-card">
            <Clock className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Inga rapporterade timmar denna vecka</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-secondary z-10 min-w-[180px]">Chaufför</TableHead>
                  {DAY_LABELS.map((d, i) => (
                    <TableHead key={d} className="text-center min-w-[70px]">
                      <div>{d}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {format(weekDays[i], 'd/M')}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold min-w-[80px]">Totalt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekGrid.map(row => (
                  <TableRow key={row.driver.id}>
                    <TableCell className="sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarColor(row.driver.full_name)}`}>
                          {getInitials(row.driver.full_name)}
                        </div>
                        <span className="text-sm font-medium truncate">{row.driver.full_name}</span>
                      </div>
                    </TableCell>
                    {row.dayCells.map((cell, i) => (
                      <TableCell key={i} className="text-center">
                        {cell.hours > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-mono font-medium rounded px-2 py-0.5 cursor-default">
                                {cell.hours.toFixed(1)}h
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                {cell.times.map((t, j) => <div key={j}>{t}</div>)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <span className="font-mono font-semibold text-sm">{row.total.toFixed(1)}h</span>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Footer totals */}
                <TableRow className="bg-secondary/50 font-semibold">
                  <TableCell className="sticky left-0 bg-secondary/50 z-10 text-sm">Totalt</TableCell>
                  {dailyTotals.map((t, i) => (
                    <TableCell key={i} className="text-center">
                      {t > 0 ? (
                        <span className="font-mono text-xs">{t.toFixed(1)}h</span>
                      ) : (
                        <span className="text-slate-300">–</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <span className="font-mono font-bold text-sm text-primary">{grandTotal.toFixed(1)}h</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
