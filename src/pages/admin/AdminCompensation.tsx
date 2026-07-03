import { useState, useEffect, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useObRates, useCreateObRate, useDeleteObRate,
  usePerDiemRates, useCreatePerDiemRate, useDeletePerDiemRate,
} from '@/hooks/useNewFeatures';
import { useAssignments, useDrivers, useDriverCompensations, useUpsertDriverCompensation } from '@/hooks/useData';
import { Plus, Moon, Briefcase, Trash2, Wallet, Save, Users, Download } from 'lucide-react';
import { toast } from 'sonner';
import { UsageInfoCard } from '@/components/admin/UsageInfoCard';
import { calculateObBreakdown, computeSalary, workedHours } from '@/lib/salary-calculation';
import { formatSwedishDate } from '@/lib/format';

const COMP_LABELS: Record<string, string> = {
  hourly: 'Timlön',
  per_assignment: 'Per uppdrag',
  monthly: 'Månadslön',
};

const AVATAR_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminCompensation() {
  const { data: obRates, isLoading: obLoading } = useObRates();
  const createOb = useCreateObRate();
  const deleteOb = useDeleteObRate();
  const { data: perDiemRates, isLoading: pdLoading } = usePerDiemRates();
  const createPd = useCreatePerDiemRate();
  const deletePd = useDeletePerDiemRate();

  const [obDialog, setObDialog] = useState(false);
  const [obName, setObName] = useState('');
  const [obRate, setObRate] = useState('');
  const [obStart, setObStart] = useState('18:00');
  const [obEnd, setObEnd] = useState('06:00');
  const [obWeekday, setObWeekday] = useState(true);
  const [obSat, setObSat] = useState(false);
  const [obSun, setObSun] = useState(false);

  const [pdDialog, setPdDialog] = useState(false);
  const [pdName, setPdName] = useState('');
  const [pdAmount, setPdAmount] = useState('');
  const [pdMinHours, setPdMinHours] = useState('10');
  const [pdType, setPdType] = useState('full_day');

  const handleCreateOb = (e: React.FormEvent) => {
    e.preventDefault();
    createOb.mutate({
      name: obName,
      rate_per_hour: parseFloat(obRate) || 0,
      start_time: obStart,
      end_time: obEnd,
      applies_to_weekdays: obWeekday,
      applies_to_saturdays: obSat,
      applies_to_sundays: obSun,
    }, {
      onSuccess: () => { setObDialog(false); setObName(''); setObRate(''); },
    });
  };

  const handleCreatePd = (e: React.FormEvent) => {
    e.preventDefault();
    createPd.mutate({
      name: pdName,
      type: pdType,
      amount: parseFloat(pdAmount) || 0,
      min_hours: parseFloat(pdMinHours) || 10,
    }, {
      onSuccess: () => { setPdDialog(false); setPdName(''); setPdAmount(''); },
    });
  };

  return (
    <AdminLayout title="Ersättningar" description="Hantera grundlön, OB-tillägg och traktamenten">
      <div className="max-w-4xl space-y-6">
        <UsageInfoCard
          icon={Wallet}
          title="Dessa regler används när tidrapporter räknas samman"
          description="OB-tillägg, traktamenten och grundlön appliceras automatiskt på chaufförernas tider — så löneunderlaget blir rätt utan manuell beräkning."
          usedFor={[
            'Beräkning av OB i tidrapporter',
            'Automatiskt traktamente per dag',
            'Underlag till lönesystem',
            'Export till bokföring',
          ]}
          nextStep={{ label: 'Visa rapporterade timmar', href: '/admin/reports' }}
        />

        <Tabs defaultValue="base">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="base" className="gap-1.5"><Wallet className="h-3.5 w-3.5" /> Grundlön</TabsTrigger>
            <TabsTrigger value="ob" className="gap-1.5"><Moon className="h-3.5 w-3.5" /> OB-tillägg</TabsTrigger>
            <TabsTrigger value="perdiem" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Traktamente</TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</TabsTrigger>
          </TabsList>

          <TabsContent value="base"><BasePayTab /></TabsContent>

          <TabsContent value="export"><SalaryExportTab /></TabsContent>

          <TabsContent value="ob" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Definiera OB-scheman för obekväm arbetstid.</p>
              <Dialog open={obDialog} onOpenChange={setObDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt OB-schema</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nytt OB-tillägg</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateOb} className="space-y-4">
                    <div className="space-y-2"><Label>Namn *</Label><Input value={obName} onChange={e => setObName(e.target.value)} required placeholder="T.ex. Kväll vardag" /></div>
                    <div className="space-y-2"><Label>Tillägg per timme (kr) *</Label><Input type="number" step="0.01" value={obRate} onChange={e => setObRate(e.target.value)} required placeholder="75" /></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Starttid</Label><Input type="time" value={obStart} onChange={e => setObStart(e.target.value)} /></div><div className="space-y-2"><Label>Sluttid</Label><Input type="time" value={obEnd} onChange={e => setObEnd(e.target.value)} /></div></div>
                    <div className="space-y-3"><Label>Gäller för</Label><div className="flex items-center gap-3"><Switch checked={obWeekday} onCheckedChange={setObWeekday} /><span className="text-sm">Vardagar</span></div><div className="flex items-center gap-3"><Switch checked={obSat} onCheckedChange={setObSat} /><span className="text-sm">Lördagar</span></div><div className="flex items-center gap-3"><Switch checked={obSun} onCheckedChange={setObSun} /><span className="text-sm">Sön- & helgdagar</span></div></div>
                    <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setObDialog(false)}>Avbryt</Button><Button type="submit" disabled={createOb.isPending}>Skapa</Button></div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card><CardContent className="p-0">{obLoading ? <div className="p-6 space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : !obRates?.length ? <div className="text-center py-12 text-muted-foreground"><Moon className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga OB-scheman definierade</p><p className="text-sm">Skapa ett schema för att beräkna OB-tillägg automatiskt.</p></div> : <Table><TableHeader><TableRow><TableHead>Namn</TableHead><TableHead>Tid</TableHead><TableHead className="text-right">Kr/h</TableHead><TableHead>Gäller</TableHead><TableHead className="w-10" /></TableRow></TableHeader><TableBody>{obRates.map(r => <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="font-mono text-xs">{r.start_time?.slice(0,5)}–{r.end_time?.slice(0,5)}</TableCell><TableCell className="text-right font-mono">{r.rate_per_hour} kr</TableCell><TableCell><div className="flex gap-1">{r.applies_to_weekdays && <Badge variant="secondary" className="text-[10px]">Vardag</Badge>}{r.applies_to_saturdays && <Badge variant="secondary" className="text-[10px]">Lör</Badge>}{r.applies_to_sundays && <Badge variant="secondary" className="text-[10px]">Sön</Badge>}</div></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteOb.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="perdiem" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Definiera traktamentsnivåer baserat på uppdragslängd.</p>
              <Dialog open={pdDialog} onOpenChange={setPdDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt traktamente</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nytt traktamente</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreatePd} className="space-y-4">
                    <div className="space-y-2"><Label>Namn *</Label><Input value={pdName} onChange={e => setPdName(e.target.value)} required placeholder="T.ex. Heldagstraktamente" /></div>
                    <div className="space-y-2"><Label>Belopp (kr) *</Label><Input type="number" step="0.01" value={pdAmount} onChange={e => setPdAmount(e.target.value)} required placeholder="260" /></div>
                    <div className="space-y-2"><Label>Minsta antal timmar</Label><Input type="number" step="0.5" value={pdMinHours} onChange={e => setPdMinHours(e.target.value)} placeholder="10" /></div>
                    <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setPdDialog(false)}>Avbryt</Button><Button type="submit" disabled={createPd.isPending}>Skapa</Button></div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card><CardContent className="p-0">{pdLoading ? <div className="p-6 space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : !perDiemRates?.length ? <div className="text-center py-12 text-muted-foreground"><Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga traktamentsnivåer definierade</p><p className="text-sm">Skapa nivåer för att beräkna traktamente automatiskt.</p></div> : <Table><TableHeader><TableRow><TableHead>Namn</TableHead><TableHead className="text-right">Belopp</TableHead><TableHead className="text-right">Min timmar</TableHead><TableHead className="w-10" /></TableRow></TableHeader><TableBody>{perDiemRates.map(r => <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right font-mono">{r.amount} kr</TableCell><TableCell className="text-right font-mono">{r.min_hours}h</TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePd.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function SalaryExportTab() {
  const defaultMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
  const [month, setMonth] = useState(defaultMonth);
  const [driverFilter, setDriverFilter] = useState('all');
  const { data: assignments } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: compensations } = useDriverCompensations();
  const { data: obRates } = useObRates();
  const { data: perDiemRates } = usePerDiemRates();

  const periodStart = startOfMonth(new Date(`${month}-01T00:00:00`));
  const periodEnd = endOfMonth(periodStart);

  const periodAssignments = useMemo(() => (assignments ?? [])
    .filter((item: any) => {
      if (item.status !== 'completed' || !item.actual_start || !item.actual_stop) return false;
      const start = new Date(item.actual_start);
      if (start < periodStart || start > periodEnd) return false;
      if (driverFilter !== 'all' && item.assigned_driver_id !== driverFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => String(a.actual_start).localeCompare(String(b.actual_start))),
  [assignments, driverFilter, periodEnd, periodStart]);

  const visibleDrivers = driverFilter === 'all' ? (drivers ?? []) : (drivers ?? []).filter((driver: any) => driver.id === driverFilter);
  const visibleCompensations = driverFilter === 'all' ? (compensations ?? []) : (compensations ?? []).filter((item: any) => item.driver_id === driverFilter);
  const salary = computeSalary(periodAssignments as any, visibleDrivers as any, visibleCompensations as any, obRates ?? [], perDiemRates ?? [], 'month');
  const hasRows = periodAssignments.length > 0;

  const exportCsv = () => {
    const driverById = new Map((drivers ?? []).map((driver: any) => [driver.id, driver]));
    const salaryByDriver = new Map(salary.rows.map(row => [row.driverId, row]));
    const includePersonalNumber = visibleDrivers.some((driver: any) => getPersonalNumber(driver));
    const headers = ['Förare', ...(includePersonalNumber ? ['Personnummer'] : []), 'Datum', 'Uppdrag', 'Timmar', 'OB-timmar', 'OB-belopp', 'Traktamente', 'Grundlön', 'Totalt'];
    const csvRows: (string | number)[][] = [headers];
    const assignmentsByDriver = new Map<string, any[]>();

    periodAssignments.forEach((assignment: any) => {
      const driverId = assignment.assigned_driver_id || 'unknown';
      assignmentsByDriver.set(driverId, [...(assignmentsByDriver.get(driverId) ?? []), assignment]);
    });

    assignmentsByDriver.forEach((driverAssignments, driverId) => {
      const driver: any = driverById.get(driverId);
      driverAssignments.forEach((assignment: any) => {
        const ob = calculateObBreakdown([assignment] as any, obRates ?? []);
        const row: (string | number)[] = [
          driver?.full_name ?? assignment.driver?.full_name ?? 'Okänd',
          ...(includePersonalNumber ? [getPersonalNumber(driver)] : []),
          formatSwedishDate(assignment.actual_start),
          `${assignment.order_number ? `${assignment.order_number} ` : ''}${assignment.title ?? ''}`.trim(),
          round2(workedHours([assignment] as any)),
          round2(ob.hours),
          round2(ob.amount),
          '',
          '',
          '',
        ];
        csvRows.push(row);
      });

      const sum = salaryByDriver.get(driverId);
      if (sum) {
        const driverOb = calculateObBreakdown(driverAssignments as any, obRates ?? []);
        csvRows.push([
          `${sum.name} – SUMMA`,
          ...(includePersonalNumber ? [getPersonalNumber(driver)] : []),
          'SUMMA',
          `${sum.assignments} uppdrag`,
          round2(sum.hours),
          round2(driverOb.hours),
          round2(sum.obTotal),
          round2(sum.perDiemTot),
          round2(sum.grossPay),
          round2(sum.total),
        ]);
      }
    });

    const csv = '\uFEFF' + csvRows.map(row => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loneunderlag-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Löneunderlag exporterades');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exportera löneunderlag</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Välj månad och chaufför. Exporten använder samma löne-, OB- och traktamentelogik som ersättningsvyn.</p>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <div className="space-y-2"><Label>Månad</Label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
          <div className="space-y-2"><Label>Chaufför</Label><Select value={driverFilter} onValueChange={setDriverFilter}><SelectTrigger><SelectValue placeholder="Välj chaufför" /></SelectTrigger><SelectContent><SelectItem value="all">Alla chaufförer</SelectItem>{(drivers ?? []).map((driver: any) => <SelectItem key={driver.id} value={driver.id}>{driver.full_name}</SelectItem>)}</SelectContent></Select></div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button onClick={exportCsv} disabled={!hasRows} className="gap-2"><Download className="h-4 w-4" /> Exportera CSV</Button>
                </span>
              </TooltipTrigger>
              {!hasRows && <TooltipContent>Perioden saknar slutförda uppdrag.</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          {hasRows ? `${periodAssignments.length} slutförda uppdrag hittades för vald period.` : 'Inga slutförda uppdrag för vald period.'}
        </div>
      </CardContent>
    </Card>
  );
}

function csvCell(value: string | number) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function round2(value: number) { return Number(value.toFixed(2)); }
function getPersonalNumber(driver: any) { return driver?.personnummer || driver?.personal_number || driver?.personalNumber || ''; }

/* ── Base Pay Tab ── */
function BasePayTab() {
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: compensations, isLoading: compLoading } = useDriverCompensations();
  const [editingId, setEditingId] = useState<string | null>(null);

  const isLoading = driversLoading || compLoading;
  const compMap = Object.fromEntries((compensations ?? []).map(c => [c.driver_id, c]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Ställ in ersättningstyp och belopp per chaufför. Dessa uppgifter används för att beräkna grundlön i tidrapporter.</p>
      <Card><CardContent className="p-0">{isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : !drivers?.length ? <div className="text-center py-12 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga chaufförer tillagda ännu</p><p className="text-sm">Bjud in förare under Chaufförer-sidan.</p></div> : <Table><TableHeader><TableRow><TableHead>Chaufför</TableHead><TableHead>Ersättningstyp</TableHead><TableHead className="text-right">Belopp</TableHead><TableHead>Skattetabell</TableHead><TableHead className="w-24" /></TableRow></TableHeader><TableBody>{drivers.map(driver => { const comp = compMap[driver.id]; const isEditing = editingId === driver.id; return isEditing ? <CompensationEditRow key={driver.id} driver={driver} existing={comp} onClose={() => setEditingId(null)} /> : <TableRow key={driver.id}><TableCell><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(driver.full_name)}`}>{getInitials(driver.full_name)}</div><div><p className="font-medium text-sm">{driver.full_name}</p><p className="text-xs text-muted-foreground">{driver.email}</p></div></div></TableCell><TableCell>{comp ? <Badge variant="secondary" className="text-xs">{COMP_LABELS[comp.compensation_type] ?? comp.compensation_type}</Badge> : <span className="text-xs text-muted-foreground italic">Ej angiven</span>}</TableCell><TableCell className="text-right font-mono text-sm">{comp ? formatCompAmount(comp) : '–'}</TableCell><TableCell className="text-sm text-muted-foreground">{comp?.tax_table || '–'}</TableCell><TableCell><Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingId(driver.id)}><Wallet className="h-3.5 w-3.5 mr-1" /> {comp ? 'Redigera' : 'Ange'}</Button></TableCell></TableRow>; })}</TableBody></Table>}</CardContent></Card>
    </div>
  );
}

function formatCompAmount(comp: any): string {
  switch (comp.compensation_type) {
    case 'hourly': return `${Number(comp.hourly_rate).toFixed(0)} kr/h`;
    case 'per_assignment': return `${Number(comp.per_assignment_rate).toFixed(0)} kr/uppdrag`;
    case 'monthly': return `${Number(comp.monthly_salary).toFixed(0)} kr/mån`;
    default: return '–';
  }
}

function CompensationEditRow({ driver, existing, onClose }: { driver: any; existing?: any; onClose: () => void }) {
  const [compType, setCompType] = useState<'hourly' | 'per_assignment' | 'monthly'>(existing?.compensation_type ?? 'hourly');
  const [hourlyRate, setHourlyRate] = useState(String(existing?.hourly_rate ?? ''));
  const [perAssignmentRate, setPerAssignmentRate] = useState(String(existing?.per_assignment_rate ?? ''));
  const [monthlySalary, setMonthlySalary] = useState(String(existing?.monthly_salary ?? ''));
  const [taxTable, setTaxTable] = useState(existing?.tax_table ?? '');
  const upsert = useUpsertDriverCompensation();

  useEffect(() => {
    if (existing) {
      setCompType(existing.compensation_type ?? 'hourly');
      setHourlyRate(String(existing.hourly_rate ?? ''));
      setPerAssignmentRate(String(existing.per_assignment_rate ?? ''));
      setMonthlySalary(String(existing.monthly_salary ?? ''));
      setTaxTable(existing.tax_table ?? '');
    }
  }, [existing]);

  const handleSave = () => {
    upsert.mutate({
      driver_id: driver.id,
      compensation_type: compType,
      hourly_rate: parseFloat(hourlyRate) || 0,
      per_assignment_rate: parseFloat(perAssignmentRate) || 0,
      monthly_salary: parseFloat(monthlySalary) || 0,
      tax_table: taxTable || null,
    }, {
      onSuccess: () => { toast.success(`Ersättning sparad för ${driver.full_name}`); onClose(); },
      onError: (err) => toast.error('Kunde inte spara: ' + err.message),
    });
  };

  return (
    <TableRow className="bg-muted/50">
      <TableCell><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(driver.full_name)}`}>{getInitials(driver.full_name)}</div><p className="font-medium text-sm">{driver.full_name}</p></div></TableCell>
      <TableCell><Select value={compType} onValueChange={(v) => setCompType(v as any)}><SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hourly">Timlön (kr/h)</SelectItem><SelectItem value="per_assignment">Per uppdrag</SelectItem><SelectItem value="monthly">Månadslön</SelectItem></SelectContent></Select></TableCell>
      <TableCell>{compType === 'hourly' && <Input type="number" min="0" step="1" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="h-8 w-[120px] text-right text-sm" placeholder="0" />}{compType === 'per_assignment' && <Input type="number" min="0" step="1" value={perAssignmentRate} onChange={e => setPerAssignmentRate(e.target.value)} className="h-8 w-[120px] text-right text-sm" placeholder="0" />}{compType === 'monthly' && <Input type="number" min="0" step="100" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} className="h-8 w-[120px] text-right text-sm" placeholder="0" />}</TableCell>
      <TableCell><Input value={taxTable} onChange={e => setTaxTable(e.target.value)} className="h-8 w-[120px] text-sm" placeholder="T.ex. Tabell 30" /></TableCell>
      <TableCell><div className="flex gap-1"><Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={upsert.isPending}><Save className="h-3 w-3 mr-1" /> Spara</Button><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClose}>Avbryt</Button></div></TableCell>
    </TableRow>
  );
}
