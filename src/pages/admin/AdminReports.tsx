import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssignments, useDrivers, useCustomers, useDriverCompensations } from '@/hooks/useData';
import { useObRates, usePerDiemRates } from '@/hooks/useNewFeatures';
import { formatSwedishDate, formatSwedishTime, calculateDecimalHours } from '@/lib/format';
import { FileText, FileSpreadsheet, Receipt, Banknote, ChevronLeft, ChevronRight, AlertTriangle, Clock, Moon, Coins, CalendarDays, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTable } from '@/components/ScrollableTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { startOfWeek, endOfWeek, addWeeks, format, getISOWeek, eachDayOfInterval, isSameDay, parseISO, getDay, startOfMonth, endOfMonth, addMonths, eachWeekOfInterval } from 'date-fns';
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

type ViewMode = 'week' | 'month';

// ── Shared salary computation ──
function computeSalary(
  filteredAssignments: any[],
  drivers: any[],
  compensations: any[],
  obRates: any[],
  perDiemRates: any[],
) {
  if (!filteredAssignments.length) return null;
  const compMap = Object.fromEntries((compensations ?? []).map(c => [c.driver_id, c]));
  const activeOb = (obRates ?? []).filter((r: any) => r.active);
  const activePd = (perDiemRates ?? []).filter((r: any) => r.active).sort((a: any, b: any) => b.min_hours - a.min_hours);
  const driverIds = [...new Set(filteredAssignments.map(a => a.assigned_driver_id))];

  let totalGross = 0, totalOb = 0, totalPerDiem = 0;
  const rows = driverIds.map(dId => {
    const driver = (drivers ?? []).find(d => d.id === dId);
    const comp = compMap[dId];
    const dAs = filteredAssignments.filter(a => a.assigned_driver_id === dId);
    const totalH = dAs.reduce((s: number, a: any) => s + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
    const count = dAs.length;

    let grossPay = 0, payType = 'Ej angiven';
    if (comp) {
      switch (comp.compensation_type) {
        case 'hourly': grossPay = totalH * Number(comp.hourly_rate); payType = `${Number(comp.hourly_rate).toFixed(0)} kr/h`; break;
        case 'per_assignment': grossPay = count * Number(comp.per_assignment_rate); payType = `${Number(comp.per_assignment_rate).toFixed(0)} kr/uppdrag`; break;
        case 'monthly': grossPay = Number(comp.monthly_salary); payType = `${Number(comp.monthly_salary).toFixed(0)} kr/mån`; break;
      }
    }

    let obTotal = 0;
    dAs.forEach((a: any) => {
      const start = parseISO(a.actual_start!);
      const stop = parseISO(a.actual_stop!);
      const dow = getDay(start);
      activeOb.forEach((rate: any) => {
        const isSat = dow === 6 && rate.applies_to_saturdays;
        const isSun = dow === 0 && rate.applies_to_sundays;
        const isWd = dow >= 1 && dow <= 5 && rate.applies_to_weekdays;
        if (!isSat && !isSun && !isWd) return;
        const [rSH, rSM] = rate.start_time.split(':').map(Number);
        const [rEH, rEM] = rate.end_time.split(':').map(Number);
        const rS = rSH * 60 + rSM, rE = rEH * 60 + rEM;
        const wS = start.getHours() * 60 + start.getMinutes();
        const wE = stop.getHours() * 60 + stop.getMinutes();
        let mins = 0;
        if (isSat || isSun) { mins = wE - wS; }
        else if (rS > rE) {
          if (wE <= rE) mins += wE;
          if (wS < rE) mins = Math.max(mins, Math.min(wE, rE) - wS);
          if (wE > rS) mins += wE - Math.max(wS, rS);
          else if (wS >= rS) mins += wE > wS ? wE - wS : 0;
        } else {
          const oS = Math.max(wS, rS), oE = Math.min(wE, rE);
          if (oE > oS) mins = oE - oS;
        }
        if (mins > 0) obTotal += (mins / 60) * Number(rate.rate_per_hour);
      });
    });

    let perDiemTot = 0;
    const dm = new Map<string, number>();
    dAs.forEach((a: any) => {
      const dk = format(parseISO(a.actual_start!), 'yyyy-MM-dd');
      dm.set(dk, (dm.get(dk) ?? 0) + calculateDecimalHours(a.actual_start!, a.actual_stop!));
    });
    dm.forEach(h => { const m = activePd.find((r: any) => h >= r.min_hours); if (m) perDiemTot += Number(m.amount); });

    totalGross += grossPay; totalOb += obTotal; totalPerDiem += perDiemTot;
    return {
      driverId: dId,
      name: driver?.full_name ?? 'Okänd',
      payType,
      hours: totalH,
      assignments: count,
      grossPay,
      obTotal,
      perDiemTot,
      total: grossPay + obTotal + perDiemTot,
      taxTable: comp?.tax_table ?? '',
    };
  });

  return { rows, totalGross, totalOb, totalPerDiem, grandTotal: totalGross + totalOb + totalPerDiem };
}

export default function AdminReports() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();
  const { data: compensations } = useDriverCompensations();
  const { data: obRates } = useObRates();
  const { data: perDiemRates } = usePerDiemRates();

  // ── Week range ──
  const currentMonday = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentSunday = endOfWeek(currentMonday, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentMonday, end: currentSunday });
  const weekNumber = getISOWeek(currentMonday);

  // ── Month range ──
  const currentMonth = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: sv });

  // Completed assignments with filters applied
  const allCompleted = useMemo(() =>
    (assignments ?? []).filter(a => {
      if (a.status !== 'completed' || !a.actual_start || !a.actual_stop) return false;
      if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
      if (customerFilter !== 'all' && a.customer_id !== customerFilter) return false;
      return true;
    }),
    [assignments, driverFilter, customerFilter]
  );

  // Helper: get UTC date string (YYYY-MM-DD) from an ISO timestamp
  const toUtcDateStr = (iso: string) => iso.slice(0, 10);
  const toUtcYearMonth = (iso: string) => iso.slice(0, 7);

  // Week range as UTC date strings for comparison
  const weekStartStr = format(currentMonday, 'yyyy-MM-dd');
  const weekEndStr = format(currentSunday, 'yyyy-MM-dd');

  // Month range as YYYY-MM string
  const monthYM = format(monthStart, 'yyyy-MM');

  // Week assignments — compare by UTC date
  const weekAssignments = useMemo(() =>
    allCompleted.filter(a => {
      const ds = toUtcDateStr(a.actual_start!);
      return ds >= weekStartStr && ds <= weekEndStr;
    }),
    [allCompleted, weekStartStr, weekEndStr]
  );

  // Month assignments — compare by UTC year-month
  const monthAssignments = useMemo(() =>
    allCompleted.filter(a => {
      const ym = toUtcYearMonth(a.actual_start!);
      return ym === monthYM;
    }),
    [allCompleted, monthYM]
  );

  const pendingApprovals = useMemo(() =>
    (viewMode === 'week' ? weekAssignments : monthAssignments).filter(a => a.status === 'completed' && !a.invoiced).length,
    [weekAssignments, monthAssignments, viewMode]
  );

  // ── Week grid ──
  const weekGrid = useMemo(() => {
    const driverList = driverFilter !== 'all'
      ? (drivers ?? []).filter(d => d.id === driverFilter)
      : (drivers ?? []).filter(d => weekAssignments.some(a => a.assigned_driver_id === d.id));

    return driverList.map(driver => {
      const dayCells = weekDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayAssignments = weekAssignments.filter(a =>
          a.assigned_driver_id === driver.id && toUtcDateStr(a.actual_start!) === dayStr
        );
        const hours = dayAssignments.reduce((s, a) => s + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
        const times = dayAssignments.map(a => `${formatSwedishTime(a.actual_start!)}–${formatSwedishTime(a.actual_stop!)}`);
        return { hours, times };
      });
      const total = dayCells.reduce((s, c) => s + c.hours, 0);
      return { driver, dayCells, total };
    });
  }, [drivers, weekAssignments, weekDays, driverFilter]);

  const dailyTotals = weekDays.map((_, i) => weekGrid.reduce((s, row) => s + row.dayCells[i].hours, 0));
  const grandTotal = weekGrid.reduce((s, row) => s + row.total, 0);

  // ── Salary summaries ──
  const weeklySalarySummary = useMemo(() =>
    computeSalary(weekAssignments, drivers ?? [], compensations ?? [], obRates ?? [], perDiemRates ?? []),
    [weekAssignments, compensations, obRates, perDiemRates, drivers]
  );

  const monthlySalarySummary = useMemo(() =>
    computeSalary(monthAssignments, drivers ?? [], compensations ?? [], obRates ?? [], perDiemRates ?? []),
    [monthAssignments, compensations, obRates, perDiemRates, drivers]
  );

  // ── Monthly per-week breakdown ──
  const monthWeekBreakdown = useMemo(() => {
    if (!monthAssignments.length) return [];
    const weekStarts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weekStarts.map(ws => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wn = getISOWeek(ws);
      const wsStr = format(ws, 'yyyy-MM-dd');
      const weStr = format(we, 'yyyy-MM-dd');
      const wAssignments = monthAssignments.filter(a => {
        const ds = toUtcDateStr(a.actual_start!);
        return ds >= wsStr && ds <= weStr;
      });
      const totalH = wAssignments.reduce((s, a) => s + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);
      const summary = computeSalary(wAssignments, drivers ?? [], compensations ?? [], obRates ?? [], perDiemRates ?? []);
      return { weekNumber: wn, start: ws, end: we, totalH, assignmentCount: wAssignments.length, summary };
    }).filter(w => w.assignmentCount > 0);
  }, [monthAssignments, monthStart, monthEnd, drivers, compensations, obRates, perDiemRates]);

  // ── Export helpers ──
  const activeAssignments = viewMode === 'week' ? weekAssignments : monthAssignments;
  const activeSummary = viewMode === 'week' ? weeklySalarySummary : monthlySalarySummary;

  const buildRows = (items: typeof allCompleted) =>
    items.map(a => ({
      driver: a.driver?.full_name || '', date: formatSwedishDate(a.actual_start!),
      customer: a.customer?.name || '', title: a.title,
      start: formatSwedishTime(a.actual_start!), stop: formatSwedishTime(a.actual_stop!),
      hours: calculateDecimalHours(a.actual_start!, a.actual_stop!),
    }));
  const dateStr = () => new Date().toISOString().split('T')[0];
  const dateRangeLabel = () => viewMode === 'week'
    ? `Vecka ${weekNumber}, ${format(currentMonday, 'd MMM', { locale: sv })} – ${format(currentSunday, 'd MMM yyyy', { locale: sv })}`
    : format(currentMonth, 'MMMM yyyy', { locale: sv });
  const filePrefix = () => viewMode === 'week' ? `v${weekNumber}` : format(currentMonth, 'yyyy-MM');

  const handleExportPdf = () => {
    const rows = buildRows(activeAssignments);
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

    // ── Lönesammanfattning ──
    const summary = activeSummary;
    if (summary && summary.rows.length > 0) {
      const lastTableY = (doc as any).lastAutoTable?.finalY ?? 80;
      const summaryStartY = lastTableY + 12;

      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Lönesammanfattning', 20, summaryStartY);

      // Summary boxes
      const boxY = summaryStartY + 6;
      const boxW = 40; const boxH = 16; const boxGap = 4;
      const summaryItems = [
        { label: 'Grundlön', value: `${Math.round(summary.totalGross).toLocaleString('sv-SE')} kr` },
        { label: 'OB-tillägg', value: `${Math.round(summary.totalOb).toLocaleString('sv-SE')} kr` },
        { label: 'Traktamente', value: `${Math.round(summary.totalPerDiem).toLocaleString('sv-SE')} kr` },
        { label: 'Totalt', value: `${Math.round(summary.grandTotal).toLocaleString('sv-SE')} kr` },
      ];
      summaryItems.forEach((item, i) => {
        const x = 20 + i * (boxW + boxGap);
        const isTotal = i === 3;
        doc.setFillColor(isTotal ? 30 : 245, isTotal ? 58 : 247, isTotal ? 95 : 250);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor(isTotal ? 255 : 100, isTotal ? 255 : 100, isTotal ? 255 : 100);
        doc.text(item.label, x + 3, boxY + 5);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(isTotal ? 255 : 30, isTotal ? 255 : 30, isTotal ? 255 : 30);
        doc.text(item.value, x + 3, boxY + 12);
      });
      doc.setTextColor(0, 0, 0);

      // Per-driver table
      autoTable(doc, {
        startY: boxY + boxH + 8,
        head: [['Chaufför', 'Grundlön', 'OB', 'Traktamente', 'Totalt']],
        body: summary.rows.map(r => [
          r.name,
          `${Math.round(r.grossPay).toLocaleString('sv-SE')} kr`,
          `${Math.round(r.obTotal).toLocaleString('sv-SE')} kr`,
          `${Math.round(r.perDiemTot).toLocaleString('sv-SE')} kr`,
          `${Math.round(r.total).toLocaleString('sv-SE')} kr`,
        ]),
        foot: [[
          'Totalt',
          `${Math.round(summary.totalGross).toLocaleString('sv-SE')} kr`,
          `${Math.round(summary.totalOb).toLocaleString('sv-SE')} kr`,
          `${Math.round(summary.totalPerDiem).toLocaleString('sv-SE')} kr`,
          `${Math.round(summary.grandTotal).toLocaleString('sv-SE')} kr`,
        ]],
        styles: { fontSize: 8 }, headStyles: { fillColor: [30, 58, 95] },
        footStyles: { fillColor: [245, 247, 250], textColor: [30, 30, 30], fontStyle: 'bold' },
      });
    }

    doc.save(`tidrapport_${filePrefix()}_${dateStr()}.pdf`);
    toast.success('PDF exporterad');
  };

  const handleExportExcel = () => {
    const rows = buildRows(activeAssignments);
    const wsData = [
      ['Chaufför', 'Datum', 'Kund', 'Uppdrag', 'Start', 'Stopp', 'Timmar'],
      ...rows.map(r => [r.driver, r.date, r.customer, r.title, r.start, r.stop, r.hours]),
      ['', '', '', '', '', 'Totalt', rows.reduce((s, r) => s + r.hours, 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tidrapport');
    XLSX.writeFile(wb, `tidrapport_${filePrefix()}_${dateStr()}.xlsx`);
    toast.success('Excel exporterad');
  };

  const handleInvoiceBasis = () => {
    if (customerFilter === 'all') { toast.error('Välj en kund först'); return; }
    const customer = (customers ?? []).find(c => c.id === customerFilter);
    if (!customer) return;
    const rows = buildRows(activeAssignments);
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
    doc.save(`faktureringsunderlag_${safeName}_${filePrefix()}.pdf`);
    toast.success('Faktureringsunderlag exporterat');
  };

  const handleSalaryReport = () => {
    const summary = activeSummary;
    if (!summary) { toast.error('Ingen data att exportera'); return; }

    const wsData = [
      ['Lönerapport', dateRangeLabel()], [],
      ['Chaufför', 'Ersättningstyp', 'Timmar', 'Uppdrag', 'Grundlön (kr)', 'OB-tillägg (kr)', 'Traktamente (kr)', 'Totalt (kr)', 'Skattetabell'],
      ...summary.rows.map(r => [
        r.name, r.payType, r.hours.toFixed(1), r.assignments,
        r.grossPay.toFixed(0), r.obTotal.toFixed(0), r.perDiemTot.toFixed(0),
        r.total.toFixed(0), r.taxTable,
      ]),
      [], ['', '', '', 'Totalt',
        summary.totalGross.toFixed(0), summary.totalOb.toFixed(0),
        summary.totalPerDiem.toFixed(0), summary.grandTotal.toFixed(0), '',
      ],
    ];

    // If monthly, add per-week breakdown sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Lönerapport');

    if (viewMode === 'month' && monthWeekBreakdown.length > 0) {
      const weekData = [
        ['Veckouppdelning', dateRangeLabel()], [],
        ['Vecka', 'Period', 'Timmar', 'Uppdrag', 'Grundlön', 'OB', 'Traktamente', 'Totalt'],
        ...monthWeekBreakdown.map(w => [
          `V${w.weekNumber}`,
          `${format(w.start, 'd/M')} – ${format(w.end, 'd/M')}`,
          w.totalH.toFixed(1),
          w.assignmentCount,
          w.summary?.totalGross.toFixed(0) ?? '0',
          w.summary?.totalOb.toFixed(0) ?? '0',
          w.summary?.totalPerDiem.toFixed(0) ?? '0',
          w.summary?.grandTotal.toFixed(0) ?? '0',
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(weekData);
      ws2['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Per vecka');
    }

    XLSX.writeFile(wb, `lonerapport_${filePrefix()}.xlsx`);
    toast.success('Lönerapport exporterad');
  };

  const salarySummary = viewMode === 'week' ? weeklySalarySummary : monthlySalarySummary;

  return (
    <AdminLayout title="Tidrapporter" description="Vecko- och månadsöversikt">
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Tidrapporter</h2>

            {/* View mode toggle */}
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)} className="mr-auto sm:mr-0">
              <TabsList className="h-9">
                <TabsTrigger value="week" className="text-xs gap-1.5 px-3">
                  <CalendarDays className="h-3.5 w-3.5" /> Vecka
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs gap-1.5 px-3">
                  <CalendarRange className="h-3.5 w-3.5" /> Månad
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Period navigator */}
            {viewMode === 'week' ? (
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg">
                <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 hover:bg-secondary rounded-l-lg transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm font-medium whitespace-nowrap">Vecka {weekNumber}</span>
                <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-secondary rounded-r-lg transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg">
                <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 hover:bg-secondary rounded-l-lg transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm font-medium whitespace-nowrap capitalize">{monthLabel}</span>
                <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 hover:bg-secondary rounded-r-lg transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Chaufför" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla chaufförer</SelectItem>
                {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Kund" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kunder</SelectItem>
                {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleExportPdf}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleExportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleInvoiceBasis}><Receipt className="h-4 w-4 mr-1" /> Faktura</Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleSalaryReport}><Banknote className="h-4 w-4 mr-1" /> Lön</Button>
          </div>
        </div>

        {/* Date range label */}
        <p className="text-sm text-muted-foreground capitalize">
          {viewMode === 'week'
            ? `${format(currentMonday, 'd MMMM', { locale: sv })} – ${format(currentSunday, 'd MMMM yyyy', { locale: sv })}`
            : `${format(monthStart, 'd MMMM', { locale: sv })} – ${format(monthEnd, 'd MMMM yyyy', { locale: sv })}`
          }
        </p>

        {/* Pending approvals banner */}
        {pendingApprovals > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {pendingApprovals} tidrapporter väntar på godkännande
            </p>
          </div>
        )}

        {/* ── WEEK VIEW: Time grid ── */}
        {viewMode === 'week' && (
          <>
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
              <ScrollableTable className="bg-card rounded-lg border border-border shadow-card -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-secondary z-10 min-w-[160px] border-r border-border whitespace-nowrap">Chaufför</TableHead>
                      {DAY_LABELS.map((d, i) => (
                        <TableHead key={d} className="text-center min-w-[70px] whitespace-nowrap">
                          <div>{d}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {format(weekDays[i], 'd/M')}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-bold min-w-[80px] whitespace-nowrap">Totalt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekGrid.map(row => (
                      <TableRow key={row.driver.id}>
                        <TableCell className="sticky left-0 bg-card z-10 border-r border-border whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shrink-0 ${avatarColor(row.driver.full_name)}`}>
                              {getInitials(row.driver.full_name)}
                            </div>
                            <span className="text-xs sm:text-sm font-medium truncate max-w-[90px] sm:max-w-none">{row.driver.full_name}</span>
                          </div>
                        </TableCell>
                        {row.dayCells.map((cell, i) => (
                          <TableCell key={i} className="text-center whitespace-nowrap">
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
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="font-mono font-semibold text-sm">{row.total.toFixed(1)}h</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-secondary/50 font-semibold">
                      <TableCell className="sticky left-0 bg-secondary/50 z-10 text-sm border-r border-border whitespace-nowrap">Totalt</TableCell>
                      {dailyTotals.map((t, i) => (
                        <TableCell key={i} className="text-center whitespace-nowrap">
                          {t > 0 ? <span className="font-mono text-xs">{t.toFixed(1)}h</span> : <span className="text-slate-300">–</span>}
                        </TableCell>
                      ))}
                      <TableCell className="text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-primary">{grandTotal.toFixed(1)}h</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </>
        )}

        {/* ── MONTH VIEW: Per-week breakdown ── */}
        {viewMode === 'month' && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : monthWeekBreakdown.length === 0 ? (
              <div className="bg-card rounded-lg border border-dashed border-border p-16 text-center shadow-card">
                <Clock className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Inga rapporterade timmar denna månad</p>
              </div>
            ) : (
              <ScrollableTable className="bg-card rounded-lg border border-border shadow-card -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-secondary z-10 min-w-[100px] border-r border-border whitespace-nowrap">Vecka</TableHead>
                      <TableHead className="min-w-[140px] whitespace-nowrap">Period</TableHead>
                      <TableHead className="text-right min-w-[80px] whitespace-nowrap">Timmar</TableHead>
                      <TableHead className="text-right min-w-[80px] whitespace-nowrap">Uppdrag</TableHead>
                      <TableHead className="text-right min-w-[90px] whitespace-nowrap">Grundlön</TableHead>
                      <TableHead className="text-right min-w-[80px] whitespace-nowrap">OB</TableHead>
                      <TableHead className="text-right min-w-[80px] whitespace-nowrap">Trakt.</TableHead>
                      <TableHead className="text-right font-bold min-w-[90px] whitespace-nowrap">Totalt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthWeekBreakdown.map(w => (
                      <TableRow key={w.weekNumber}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium border-r border-border whitespace-nowrap">V{w.weekNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(w.start, 'd MMM', { locale: sv })} – {format(w.end, 'd MMM', { locale: sv })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">{w.totalH.toFixed(1)}h</TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">{w.assignmentCount}</TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">{(w.summary?.totalGross ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">{(w.summary?.totalOb ?? 0) > 0 ? `${(w.summary?.totalOb ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr` : '–'}</TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">{(w.summary?.totalPerDiem ?? 0) > 0 ? `${(w.summary?.totalPerDiem ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr` : '–'}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold whitespace-nowrap">{(w.summary?.grandTotal ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                      </TableRow>
                    ))}
                    {/* Month totals row */}
                    <TableRow className="bg-secondary/50 font-semibold">
                      <TableCell className="sticky left-0 bg-secondary/50 z-10 border-r border-border whitespace-nowrap">Totalt</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {monthWeekBreakdown.reduce((s, w) => s + w.totalH, 0).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {monthWeekBreakdown.reduce((s, w) => s + w.assignmentCount, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {(monthlySalarySummary?.totalGross ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {(monthlySalarySummary?.totalOb ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {(monthlySalarySummary?.totalPerDiem ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-primary whitespace-nowrap">
                        {(monthlySalarySummary?.grandTotal ?? 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </>
        )}

        {/* Salary summary with OB & per diem */}
        {salarySummary && salarySummary.rows.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Lönesammanfattning {viewMode === 'month' ? `– ${monthLabel}` : ''}
            </h3>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5" /> Grundlön
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold text-foreground">{salarySummary.totalGross.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5" /> OB-tillägg
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold text-foreground">{salarySummary.totalOb.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5" /> Traktamente
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold text-foreground">{salarySummary.totalPerDiem.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-primary flex items-center gap-1.5">
                    Totalt
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold text-primary">{salarySummary.grandTotal.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</p>
                </CardContent>
              </Card>
            </div>

            {/* Per-driver breakdown */}
            <ScrollableTable className="bg-card rounded-lg border border-border shadow-card -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-secondary z-10 min-w-[130px] border-r border-border whitespace-nowrap">Chaufför</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[80px]">Grundlön</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[80px]">OB</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[80px]">Trakt.</TableHead>
                    <TableHead className="text-right font-bold whitespace-nowrap min-w-[80px]">Totalt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salarySummary.rows.map(r => (
                    <TableRow key={r.name}>
                      <TableCell className="sticky left-0 bg-card z-10 border-r border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shrink-0 ${avatarColor(r.name)}`}>
                            {getInitials(r.name)}
                          </div>
                          <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">{r.grossPay.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">{r.obTotal > 0 ? `${r.obTotal.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr` : '–'}</TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">{r.perDiemTot > 0 ? `${r.perDiemTot.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr` : '–'}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold whitespace-nowrap">{r.total.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/50 font-semibold">
                    <TableCell className="sticky left-0 bg-secondary/50 z-10 border-r border-border whitespace-nowrap">Totalt</TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">{salarySummary.totalGross.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">{salarySummary.totalOb.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">{salarySummary.totalPerDiem.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-primary whitespace-nowrap">{salarySummary.grandTotal.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}