import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Inbox, Loader2, MapPin, MoreHorizontal, Plus, RefreshCw, Search, Sparkles, UserRound, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignments, useDrivers, useBulkAssignDriver, useCancelAssignment } from '@/hooks/useData';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoAssignments, demoDrivers, type DemoAssignment } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { AssignDriverDialog, type DispatchDriver } from '@/features/dispatch/AssignDriverDialog';
import { filterDispatchAssignments, formatStockholmTime, getAssignmentDelayMinutes, getStockholmDateKey, isAssignableAssignment, isOpenAssignment, isOverdueAssignment, matchesDispatchFilter } from '@/features/dispatch/dispatch-utils';

type AssignmentRow = NonNullable<ReturnType<typeof useAssignments>['data']>[number];
type AssignmentItem = AssignmentRow | DemoAssignment;
const filterTabs = [
 {key: 'all', label: 'Alla'}, {key: 'unassigned', label: 'Ej tilldelade'},
 {key: 'pending', label: 'Planerade'}, {key: 'active', label: 'Pågår'},
 {key: 'completed', label: 'Klara'}, {key: 'problem', label: 'Problem'},
 {key: 'overdue', label: 'Sen start'}, {key: 'delayed', label: 'Försenade'},
 {key: 'urgent', label: 'Brådskande'}, {key: 'cancelled', label: 'Avbokade'}, {key: 'proof', label: 'Saknar leveransbevis'},
] as const;
const matchesFilter = (item: AssignmentItem, filter: string, now: Date) => filter === 'problem'
 ? matchesDispatchFilter(item, 'delayed', now) || matchesDispatchFilter(item, 'overdue', now)
 : matchesDispatchFilter(item, filter, now);
function assignmentPrice(a: AssignmentItem) {
 const amount = a.cost ?? (a.customer?.pricing_type === 'per_delivery' ? a.customer.price_per_delivery : null);
 return amount == null ? '–' : `${Number(amount).toLocaleString('sv-SE')} kr`;
}
const canAssign = isAssignableAssignment;
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm', weekday: 'long', day: 'numeric', month: 'long' });
function shiftDay(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return getStockholmDateKey(value);
}
function RouteSummary({ assignment: a }: { assignment: AssignmentItem }) {
  const pickup = a.pickup_address;
  const delivery = a.delivery_address;
  if (pickup && delivery) return <div className="relative space-y-2 pl-4 text-xs"><span className="absolute bottom-1 left-[3px] top-1 border-l border-dashed border-muted-foreground/40" /><p className="relative line-clamp-1"><span className="absolute -left-4 top-1 h-2 w-2 rounded-full border-2 border-primary bg-card" />{pickup}</p><p className="relative line-clamp-1 text-muted-foreground"><span className="absolute -left-4 top-1 h-2 w-2 rounded-sm bg-primary" />{delivery}</p></div>;
  return <p className="flex items-start gap-2 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{pickup || delivery || a.address || 'Adress saknas'}</span></p>;
}
function DriverName({ assignment: a }: { assignment: AssignmentItem }) {
  return a.driver ? <span className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{a.driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><span className="text-xs">{a.driver.full_name}</span></span> : <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />Ej tilldelad</span>;
}

function AssignmentActions({ item, showingDemo, openAssignment, onAssign, onCopy, onCancel }: {
  item: AssignmentItem;
  showingDemo: boolean;
  openAssignment: (item: AssignmentItem) => void;
  onAssign: (ids: string[]) => void;
  onCopy: (item: AssignmentItem) => void;
  onCancel: (item: AssignmentItem) => void;
}) {
    return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Åtgärder för ${item.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openAssignment(item)}>Öppna uppdrag</DropdownMenuItem>{canAssign(item) && <DropdownMenuItem onClick={() => onAssign([item.id])}>Tilldela förare</DropdownMenuItem>}{!showingDemo && <DropdownMenuItem onClick={() => onCopy(item)}>Kopiera</DropdownMenuItem>}{isOpenAssignment(item) && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => onCancel(item)}>Avboka</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>;
  }

function Schedule({ item, date, now }: { item: AssignmentItem; date: string; now: Date }) {
    const overdue = isOverdueAssignment(item, now);
    return <div className="space-y-1"><p className="whitespace-nowrap font-mono text-sm font-medium">{formatStockholmTime(item.scheduled_start)}{item.scheduled_end && <span className="text-xs font-normal text-muted-foreground">–{formatStockholmTime(item.scheduled_end)}</span>}</p>{date === 'all' && <p className="font-mono text-[10px] text-muted-foreground">{getStockholmDateKey(item.scheduled_start)}</p>}{overdue && <p className="flex items-center gap-1 text-[11px] font-medium text-destructive"><Clock3 className="h-3 w-3" />{getAssignmentDelayMinutes(item, now)} min sen start</p>}</div>;
  }

export default function AdminAssignments() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [now, setNow] = useState(() => new Date());
  const today = getStockholmDateKey(now);
  const dateParam = params.get('date');
  const date = dateParam === 'all' || (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && getStockholmDateKey(`${dateParam}T12:00:00Z`) === dateParam) ? dateParam : today;
  const statusFilter = filterTabs.some(tab => tab.key === params.get('filter')) ? params.get('filter')! : 'all';
  const driverFilter = params.get('driver') || 'all';
  const search = params.get('q') || '';
  const [selected, setSelected] = useState<string[]>([]);
  const [assignIds, setAssignIds] = useState<string[] | null>(null);
  const [cancelItem, setCancelItem] = useState<AssignmentItem | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [demoDetail, setDemoDetail] = useState<AssignmentItem | null>(null);
  const [demoChanges, setDemoChanges] = useState<Record<string, Partial<DemoAssignment>>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: assignments, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useAssignments();
  const { data: drivers, isError: driversError, refetch: refetchDrivers } = useDrivers();
  const bulkAssign = useBulkAssignDriver();
  const cancelMutation = useCancelAssignment();
  const demo = useDemoMode();
  const showingDemo = demo.enabled;
  const loading = !showingDemo && isLoading;
  const loadFailed = !showingDemo && isError;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { setSelected([]); }, [params, showingDemo]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"]')) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const effectiveAssignments = useMemo<AssignmentItem[]>(() => showingDemo ? demoAssignments.map(a => ({ ...a, assigned_driver_id: a.assigned_driver_id ?? demoDrivers.find(d => d.full_name === a.driver?.full_name)?.id ?? null, ...demoChanges[a.id] })) : assignments ?? [], [assignments, showingDemo, demoChanges]);
  const effectiveDrivers: DispatchDriver[] = showingDemo ? demoDrivers : drivers ?? [];
  const scoped = useMemo(() => filterDispatchAssignments(effectiveAssignments, { date, filter: 'all', driverId: driverFilter, search, now }), [effectiveAssignments, date, driverFilter, search, now]);
  const filtered = useMemo(() => scoped.filter(a => matchesFilter(a, statusFilter, now)), [scoped, statusFilter, now]);
  const counts = Object.fromEntries(filterTabs.map(tab => [tab.key, scoped.filter(a => matchesFilter(a, tab.key, now)).length]));
  const selectable = filtered.filter(canAssign);
  const visibleSelected = selected.filter(id => selectable.some(a => a.id === id));
  const allSelected = selectable.length > 0 && selectable.every(a => visibleSelected.includes(a.id));
  const selectedJobs = effectiveAssignments.filter(a => assignIds?.includes(a.id));
  const oldUnresolved = effectiveAssignments.filter(a => isOpenAssignment(a) && getStockholmDateKey(a.scheduled_start) < today).length;
  const hasFilters = statusFilter !== 'all' || driverFilter !== 'all' || search.length > 0;

  function updateFilters(changes: Record<string, string>) {
    setSelected([]);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
      return next;
    }, { replace: true });
  }
  function toggleSelect(id: string) { setSelected(visibleSelected.includes(id) ? visibleSelected.filter(value => value !== id) : [...visibleSelected, id]); }
  function openAssignment(a: AssignmentItem) { if (showingDemo) setDemoDetail(a); else navigate(`/admin/assignments/${a.id}`); }
  async function assignDriver(driverId: string, ids: string[]) {
    if (showingDemo) {
      const driver = effectiveDrivers.find(d => d.id === driverId)!;
      setDemoChanges(previous => ({ ...previous, ...Object.fromEntries(ids.map(id => [id, { ...previous[id], assigned_driver_id: driverId, driver: { full_name: driver.full_name } }])) }));
    } else {
      await bulkAssign.mutateAsync({ assignmentIds: ids, driverId });
    }
    setSelected([]);
    toast.success(`${ids.length} uppdrag tilldelade ${effectiveDrivers.find(d => d.id === driverId)?.full_name ?? 'föraren'}`, { description: showingDemo ? 'Endast exempeldata ändrades.' : undefined });
  }
  async function cancelAssignment() {
    if (!cancelItem || cancelMutation.isPending) return;
    setCancelError('');
    const current = effectiveAssignments.find(item => item.id === cancelItem.id);
    if (!current || !isOpenAssignment(current)) {
      setCancelError('Uppdraget har ändrats och kan inte längre avbokas. Stäng dialogen och kontrollera körplanen.');
      return;
    }
    try {
      if (showingDemo) {
        setDemoChanges(previous => ({ ...previous, [cancelItem.id]: { ...previous[cancelItem.id], status: 'cancelled' } }));
        toast.success('Exempeluppdraget avbokat');
      } else {
        await cancelMutation.mutateAsync(cancelItem.id);
      }
      setCancelItem(null);
    } catch { setCancelError('Uppdraget kunde inte avbokas. Försök igen.'); }
  }


  return (
    <AdminLayout title="Uppdrag">
      <div className="space-y-5">


        {showingDemo && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm"><Sparkles className="h-4 w-4 text-warning" /><span><strong>Prova uppdragen.</strong> Tilldelningar och avbokningar ändrar bara exempeldata.</span><Button className="ml-auto h-7" size="sm" variant="ghost" onClick={demo.disable}>Visa mina uppdrag</Button></div>}
        {loadFailed && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Kunde inte hämta uppdragen</AlertTitle><AlertDescription>Översikten kan vara inaktuell. <Button variant="outline" size="sm" className="ml-2" onClick={() => void refetch()} disabled={isFetching}>Försök igen</Button></AlertDescription></Alert>}



        {date !== 'all' && oldUnresolved > 0 && !loading && !loadFailed && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-sm"><AlertTriangle className="h-4 w-4 text-warning" /><span>{oldUnresolved} öppna uppdrag ligger före idag.</span><Button variant="link" size="sm" className="ml-auto h-6 p-0" onClick={() => updateFilters({ date: 'all', filter: 'all', driver: 'all', q: '' })}>Granska alla datum <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></div>}

        <div className="grid items-start gap-5">
          <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="space-y-3 border-b p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h3 className="font-semibold">{date === 'all' ? 'Alla uppdrag' : dateLabel(date)}</h3><Badge variant="secondary" className="font-mono text-[10px]">{filtered.length}</Badge></div><div className="flex items-center gap-2 text-[11px] text-muted-foreground">{showingDemo ? 'Exempeldata' : dataUpdatedAt > 0 ? `Hämtat ${formatStockholmTime(new Date(dataUpdatedAt))}` : 'Hämtar uppdrag'}<Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Uppdatera uppdrag" disabled={isFetching || showingDemo} onClick={() => void refetch()}><RefreshCw className={cn('h-3.5 w-3.5', isFetching && !showingDemo && 'animate-spin')} /></Button></div></div>
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1">{[{ value: today, label: 'Idag' }, { value: shiftDay(today, 1), label: 'Imorgon' }, { value: 'all', label: 'Alla datum' }].map(item => <Button key={item.value} variant={date === item.value ? 'secondary' : 'ghost'} size="sm" className={cn('h-8 text-xs', date === item.value && 'bg-card shadow-sm')} aria-pressed={date === item.value} onClick={() => updateFilters({ date: item.value })}>{item.label}</Button>)}</div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Föregående dag" onClick={() => updateFilters({ date: shiftDay(date === 'all' ? today : date, -1) })}><ChevronLeft className="h-4 w-4" /></Button><Input type="date" aria-label="Välj datum" value={date === 'all' ? '' : date} onChange={e => updateFilters({ date: e.target.value || 'all' })} className="h-8 w-[150px] text-xs" /><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Nästa dag" onClick={() => updateFilters({ date: shiftDay(date === 'all' ? today : date, 1) })}><ChevronRight className="h-4 w-4" /></Button></div></div>
              <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input ref={searchRef} aria-label="Sök uppdrag" placeholder="Sök uppdrag, kund, rutt eller förare…" value={search} onChange={e => updateFilters({ q: e.target.value })} className="pl-9 pr-9" />{search ? <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" aria-label="Rensa sökning" onClick={() => updateFilters({ q: '' })}><X className="h-3.5 w-3.5" /></Button> : <kbd className="absolute right-3 top-3 hidden text-xs text-muted-foreground sm:block">/</kbd>}</div><Select value={driverFilter} onValueChange={value => updateFilters({ driver: value })}><SelectTrigger className="sm:w-[190px]" aria-label="Filtrera förare"><SelectValue placeholder="Alla förare" /></SelectTrigger><SelectContent><SelectItem value="all">Alla förare</SelectItem>{effectiveDrivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="admin-filter-row" aria-label="Filtrera uppdrag">{filterTabs.slice(0, 6).map(tab => <Button key={tab.key} size="sm" variant={statusFilter === tab.key ? 'default' : 'ghost'} className="h-8 shrink-0 gap-2 text-xs" aria-label={tab.label} aria-pressed={statusFilter === tab.key} onClick={() => updateFilters({ filter: tab.key })}>{tab.label}<span className={cn('rounded px-1.5 py-0.5 font-mono text-[10px]', statusFilter === tab.key ? 'bg-white/15' : 'bg-muted text-muted-foreground')}>{counts[tab.key]}</span></Button>)}</div>
              <details><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">Fler filter</summary><div className="admin-filter-row">{filterTabs.slice(6).map(tab => <Button key={tab.key} variant="ghost" aria-pressed={statusFilter === tab.key} onClick={() => updateFilters({filter: tab.key})}>{tab.label}<span className="ml-2">{counts[tab.key]}</span></Button>)}</div></details>
            </div>

            {visibleSelected.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2.5" role="region" aria-label="Valda uppdrag"><span className="mr-auto text-sm font-medium text-primary">{visibleSelected.length} valda uppdrag</span><Button size="sm" onClick={() => setAssignIds(visibleSelected)}><Users className="mr-2 h-4 w-4" />Tilldela förare</Button><Button size="sm" variant="ghost" onClick={() => setSelected([])}>Avmarkera</Button></div>}
            {loading ? <div className="space-y-4 p-4" role="status" aria-label="Laddar uppdrag">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div> : loadFailed && !assignments ? <div className="p-12 text-center text-sm text-muted-foreground">Uppdragen visas när anslutningen fungerar igen.</div> : filtered.length === 0 ? <div className="flex flex-col items-center px-5 py-14 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><Inbox className="h-6 w-6 text-muted-foreground" /></div><h4 className="font-semibold">{hasFilters ? 'Inga uppdrag matchar urvalet' : date === today ? 'Dagen är redo för nya körningar' : 'Inga uppdrag på valt datum'}</h4><p className="mt-2 max-w-sm text-sm text-muted-foreground">{hasFilters ? 'Prova en annan förare, status eller sökning.' : 'Skapa ett uppdrag eller välj ett annat datum i körplanen.'}</p><div className="mt-5 flex flex-wrap justify-center gap-2">{hasFilters ? <Button variant="outline" onClick={() => updateFilters({ filter: 'all', driver: 'all', q: '' })}>Rensa filter</Button> : <Button asChild><Link to="/admin/assignments/new"><Plus className="mr-2 h-4 w-4" />Nytt uppdrag</Link></Button>}<Button variant="outline" onClick={() => updateFilters({ date: 'all' })}>Alla datum</Button>{!showingDemo && effectiveAssignments.length === 0 && <Button variant="ghost" onClick={demo.enable}>Prova med exempeldata</Button>}</div></div> : <>
              <div className="hidden md:block"><Table><TableHeader><TableRow>
               <TableHead className="w-12"><Checkbox aria-label="Markera alla planerade uppdrag" checked={allSelected ? true : visibleSelected.length ? 'indeterminate' : false} disabled={!selectable.length} onCheckedChange={() => setSelected(allSelected ? [] : selectable.map(a => a.id))} /></TableHead>
               <TableHead>#</TableHead><TableHead>Kund</TableHead><TableHead>Från → Till</TableHead><TableHead>Tid</TableHead><TableHead>Förare</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Pris</TableHead><TableHead><span className="sr-only">Åtgärder</span></TableHead>
              </TableRow></TableHeader><TableBody>{filtered.map(a => <TableRow key={a.id} className="cursor-pointer" onClick={e => {if (!(e.target as HTMLElement).closest('button,a,[role=checkbox]')) openAssignment(a);}}>
                <TableCell><Checkbox aria-label={`Markera ${a.title}`} checked={visibleSelected.includes(a.id)} disabled={!canAssign(a)} onCheckedChange={() => toggleSelect(a.id)} /></TableCell>
                <TableCell><button className="text-xs text-muted-foreground" aria-label={`Öppna ${a.title}`} onClick={() => openAssignment(a)}>{a.id.slice(-6).toUpperCase()}</button></TableCell>
                <TableCell><button className="text-left font-medium" onClick={() => openAssignment(a)}>{a.customer?.name || 'Ingen kund'}</button><p className="mt-1 text-xs text-muted-foreground">{a.title}</p>{a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}</TableCell>
                <TableCell><RouteSummary assignment={a} /></TableCell><TableCell><Schedule item={a} date={date} now={now} /></TableCell>
                <TableCell>{!a.assigned_driver_id && canAssign(a) ? <Button variant="outline" size="sm" onClick={() => setAssignIds([a.id])}>Tilldela</Button> : <DriverName assignment={a} />}</TableCell>
                <TableCell><StatusBadge status={matchesDispatchFilter(a, 'unassigned', now) ? 'unassigned' : a.status} /></TableCell><TableCell className="text-right whitespace-nowrap">{assignmentPrice(a)}</TableCell>
                <TableCell><AssignmentActions item={a} showingDemo={showingDemo} openAssignment={openAssignment} onAssign={setAssignIds} onCopy={item => navigate('/admin/assignments/new', {state:{copy:item}})} onCancel={item => {setCancelError('');setCancelItem(item);}} /></TableCell>
              </TableRow>)}</TableBody></Table></div>
              <div className="divide-y md:hidden"><div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground"><Checkbox id="dispatch-mobile-select-all" aria-label="Markera alla planerade uppdrag" checked={allSelected ? true : visibleSelected.length ? 'indeterminate' : false} disabled={!selectable.length} onCheckedChange={() => setSelected(allSelected ? [] : selectable.map(a => a.id))} /><label htmlFor="dispatch-mobile-select-all">Markera planerade uppdrag</label></div>{filtered.map(a => <article key={a.id} className={cn('space-y-3 p-4', visibleSelected.includes(a.id) && 'bg-primary/5')}><div className="flex items-start gap-3"><Checkbox className="mt-1" aria-label={`Markera ${a.title}`} checked={visibleSelected.includes(a.id)} disabled={!canAssign(a)} onCheckedChange={() => toggleSelect(a.id)} /><div className="min-w-0 flex-1"><button className="text-left text-sm font-semibold hover:text-primary hover:underline" onClick={() => openAssignment(a)}>{a.title}</button><p className="mt-0.5 text-xs text-muted-foreground">{a.customer?.name || 'Ingen kund'}</p></div><AssignmentActions item={a} showingDemo={showingDemo} openAssignment={openAssignment} onAssign={setAssignIds} onCopy={item => navigate('/admin/assignments/new', { state: { copy: item } })} onCancel={item => { setCancelError(''); setCancelItem(item); }} /></div><div className="pl-7"><RouteSummary assignment={a} /><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><Schedule item={a} date={date} now={now} /><StatusBadge status={matchesDispatchFilter(a, 'unassigned', now) ? 'unassigned' : a.status} /></div><div className="mt-3 flex items-center justify-between gap-2 border-t pt-3"><DriverName assignment={a} /><span className="ml-auto text-sm tabular-nums">{assignmentPrice(a)}</span>{canAssign(a) && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssignIds([a.id])}>Tilldela förare</Button>}{a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}</div></div></article>)}</div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground"><span>Visar {filtered.length} av {scoped.length} uppdrag i urvalet</span><span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />Avvikelser först, sedan starttid</span></div>
            </>}
          </section>

          <details className="space-y-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Förarnas läge och planering</summary><aside className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Föraresläge</h3><Users className="h-4 w-4 text-muted-foreground" /></div><p className="mb-4 mt-1 text-xs text-muted-foreground">Öppna uppdrag · {date === 'all' ? 'alla datum' : date === today ? 'idag' : date}</p>{driversError && !showingDemo ? <div className="text-sm text-muted-foreground">Kunde inte hämta förare.<Button variant="link" size="sm" onClick={() => void refetchDrivers()}>Försök igen</Button></div> : effectiveDrivers.length === 0 ? <p className="py-2 text-xs text-muted-foreground">Inga förare att visa ännu.</p> : <div className="space-y-1">{effectiveDrivers.map(driver => { const jobs = effectiveAssignments.filter(a => a.assigned_driver_id === driver.id && isOpenAssignment(a) && (date === 'all' || getStockholmDateKey(a.scheduled_start) === date)); return <Button key={driver.id} variant="ghost" className={cn('h-auto w-full justify-start gap-2.5 px-2 py-2.5 text-left', driverFilter === driver.id && 'bg-primary/5 ring-1 ring-primary/20')} onClick={() => updateFilters({ driver: driverFilter === driver.id ? 'all' : driver.id, filter: 'all' })}><span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}<span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card', driver.is_available ? 'bg-success' : 'bg-muted-foreground/50')} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{driver.full_name}</span><span className="block text-[10px] font-normal text-muted-foreground">{driver.is_available === true ? 'Tillgänglig' : driver.is_available === false ? 'Ej tillgänglig' : 'Tillgänglighet okänd'}</span></span><span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{jobs.length}</span></Button>; })}</div>}<Button variant="outline" size="sm" className="mt-4 w-full text-xs" asChild><Link to="/admin/drivers">Hantera förare <ArrowRight className="ml-auto h-3.5 w-3.5" /></Link></Button></section>
            <section className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4"><CalendarDays className="mb-3 h-5 w-5 text-primary" /><h3 className="text-sm font-semibold">Planera nästa steg</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Se veckan i kalendern eller lägg körningarna i rätt ordning.</p><div className="mt-3 space-y-1"><Button variant="ghost" size="sm" className="w-full justify-between px-0 text-xs" asChild><Link to="/admin/calendar">Öppna kalendern <ArrowRight className="h-3.5 w-3.5" /></Link></Button><Button variant="ghost" size="sm" className="w-full justify-between px-0 text-xs" asChild><Link to="/admin/routes">Planera rutter <ArrowRight className="h-3.5 w-3.5" /></Link></Button></div></section>
          </aside></details>
        </div>
      </div>
      {assignIds && <AssignDriverDialog key={assignIds.join(',')} assignments={effectiveAssignments} selectedIds={assignIds} drivers={effectiveDrivers} initialDriverId={selectedJobs.length === 1 ? selectedJobs[0].assigned_driver_id ?? '' : ''} demo={showingDemo} onClose={() => setAssignIds(null)} onAssign={assignDriver} />}
      <AlertDialog open={Boolean(cancelItem)} onOpenChange={open => { if (!open && !cancelMutation.isPending) setCancelItem(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Avboka uppdrag?</AlertDialogTitle><AlertDialogDescription>Du avbokar ”{cancelItem?.title}”. Uppdraget finns kvar i historiken men räknas inte längre som en öppen körning.</AlertDialogDescription></AlertDialogHeader>{cancelError && <Alert variant="destructive"><AlertDescription>{cancelError}</AlertDescription></Alert>}<AlertDialogFooter><Button variant="outline" onClick={() => setCancelItem(null)} disabled={cancelMutation.isPending}>Behåll uppdrag</Button><Button variant="destructive" onClick={() => void cancelAssignment()} disabled={cancelMutation.isPending}>{cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Avboka uppdrag</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={Boolean(demoDetail)} onOpenChange={open => { if (!open) setDemoDetail(null); }}><DialogContent><DialogHeader><DialogTitle>{demoDetail?.title}</DialogTitle><DialogDescription>Exempeluppdrag · {demoDetail?.customer?.name}</DialogDescription></DialogHeader>{demoDetail && <div className="space-y-5"><StatusBadge status={demoDetail.status} /><RouteSummary assignment={demoDetail} /><Schedule item={demoDetail} date={date} now={now} /><DriverName assignment={demoDetail} /><p className="text-sm text-muted-foreground">I dina egna uppdrag finns hela körordern, kundinformationen och leveransunderlaget.</p><Button className="w-full" onClick={() => { if (canAssign(demoDetail)) setAssignIds([demoDetail.id]); setDemoDetail(null); }}>{canAssign(demoDetail) ? 'Prova tilldelning' : 'Tillbaka till körplanen'}</Button></div>}</DialogContent></Dialog>
    </AdminLayout>
  );
}
