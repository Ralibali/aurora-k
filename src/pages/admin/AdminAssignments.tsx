import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignments, useDrivers, useBulkAssignDriver, useUpdateAssignment } from '@/hooks/useData';
import { formatSwedishDateTime, formatSwedishTime } from '@/lib/format';
import { Plus, Search, Users, Clock, Inbox, MoreHorizontal, Route, UserX, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StaggeredTableBody, StaggeredTableRow, StaggeredList, StaggeredItem } from '@/components/StaggeredList';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoAssignments } from '@/lib/demo-data';
import { EmptyState } from '@/components/EmptyState';
import { Inbox as InboxIcon } from 'lucide-react';
import { DemoModeBanner } from '@/components/DemoModeBanner';

const filterTabs = [
  { key: 'all', label: 'Alla', dotClass: 'bg-muted-foreground/40' },
  { key: 'unassigned', label: 'Saknar förare', dotClass: 'bg-amber-500' },
  { key: 'urgent', label: 'Brådskande', dotClass: 'bg-rose-500' },
  { key: 'pending', label: 'Tilldelade', dotClass: 'bg-blue-500' },
  { key: 'active', label: 'Pågående', dotClass: 'bg-emerald-500' },
  { key: 'completed', label: 'Slutförda', dotClass: 'bg-slate-400' },
] as const;

function getRouteSummary(a: any) {
  const pickup = a.pickup_address;
  const delivery = a.delivery_address;
  if (pickup && delivery) return `${pickup} → ${delivery}`;
  return pickup || delivery || a.address;
}

function matchesTab(a: any, tab: string) {
  if (tab === 'all') return true;
  if (tab === 'unassigned') return !a.assigned_driver_id;
  if (tab === 'urgent') return a.priority === 'urgent' || a.priority === 'high';
  return a.status === tab;
}

export default function AdminAssignments() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const bulkAssign = useBulkAssignDriver();
  const updateAssignment = useUpdateAssignment();
  const demo = useDemoMode();

  const effectiveAssignments = useMemo(() => {
    const real = assignments ?? [];
    if (demo.enabled && real.length === 0) {
      return demoAssignments.map((a: any) => ({
        ...a,
        assigned_driver_id: a.assigned_driver_id ?? a.driver?.full_name ?? null,
        scheduled_end: a.scheduled_end ?? null,
        instructions: a.instructions ?? null,
      }));
    }
    return real;
  }, [assignments, demo.enabled]);

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: sv });

  const filtered = useMemo(() =>
    effectiveAssignments.filter((a: any) => {
      if (!matchesTab(a, statusFilter)) return false;
      if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${a.title} ${a.customer?.name ?? ''} ${a.address ?? ''} ${a.pickup_address ?? ''} ${a.delivery_address ?? ''} ${a.service_type ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a: any, b: any) => b.scheduled_start.localeCompare(a.scheduled_start)),
    [effectiveAssignments, statusFilter, driverFilter, search]
  );

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: 0, unassigned: 0, urgent: 0, pending: 0, active: 0, completed: 0 };
    for (const a of effectiveAssignments as any[]) {
      base.all += 1;
      if (!a.assigned_driver_id) base.unassigned += 1;
      if (a.priority === 'urgent' || a.priority === 'high') base.urgent += 1;
      if (base[a.status] !== undefined) base[a.status] += 1;
    }
    return base;
  }, [effectiveAssignments]);

  const todayCount = useMemo(() => {
    const todayPrefix = format(new Date(), 'yyyy-MM-dd');
    return (effectiveAssignments as any[]).filter(a => a.scheduled_start?.startsWith(todayPrefix)).length;
  }, [effectiveAssignments]);

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => { if (selected.length === filtered.length) setSelected([]); else setSelected(filtered.map((a: any) => a.id)); };

  return (
    <AdminLayout title="Uppdrag" description="Transportledning, rutter och förare">
      <div className="space-y-5">
        {demo.enabled && <DemoModeBanner onDisable={demo.disable} />}

        <div className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-3 bg-blue-500/20 text-blue-100 hover:bg-blue-500/20"><Truck className="mr-1 h-3 w-3" /> Dispatchvy</Badge>
              <h2 className="text-2xl font-bold text-white">Uppdrag</h2>
              <p className="text-sm text-slate-300 capitalize">{today}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-slate-300">Idag</p><p className="text-2xl font-bold">{todayCount}</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-slate-300">Saknar förare</p><p className="text-2xl font-bold">{counts.unassigned}</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-slate-300">Brådskande</p><p className="text-2xl font-bold">{counts.urgent}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök uppdrag, rutt, kund..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 sm:w-[280px]" />
            </div>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="Chaufför" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla chaufförer</SelectItem>
                {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {!demo.enabled && <Button variant="outline" onClick={demo.enable}>Demo mode</Button>}
            <Button asChild><Link to="/admin/assignments/new"><Plus className="h-4 w-4 mr-1" /> Skapa uppdrag</Link></Button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 border-b border-border">
          {filterTabs.map(tab => {
            const isActive = statusFilter === tab.key;
            const count = counts[tab.key] ?? 0;
            return (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)} className={`group inline-flex items-center gap-2 px-3.5 py-2 text-sm whitespace-nowrap rounded-md transition-all ${isActive ? 'bg-primary/10 text-primary font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${tab.dotClass}`} />{tab.label}
                <span className={`ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] rounded-full ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-700">{selected.length} valda</span>
            <Button size="sm" variant="outline" onClick={() => setBulkDialogOpen(true)}><Users className="h-4 w-4 mr-1" /> Tilldela chaufför</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Avmarkera</Button>
          </div>
        )}

        {isLoading ? (
          <div className="hidden md:block bg-card rounded-lg border border-border shadow-card overflow-hidden"><Table><TableBody>{[1,2,3,4,5].map(i => <TableRow key={i}><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>)}</TableBody></Table></div>
        ) : filtered.length === 0 ? (
          effectiveAssignments.length === 0 ? <EmptyState icon={InboxIcon} title="Skapa ditt första uppdrag" description="Samla körningar, förare, tider och kundinformation på ett ställe." hint="Tips: aktivera Demo mode för att visa en säljklar version med exempeldata." actionLabel="Skapa uppdrag" actionHref="/admin/assignments/new" secondaryLabel="Aktivera Demo mode" onSecondaryAction={demo.enable} /> : <div className="bg-card rounded-lg border border-dashed border-border p-16 text-center shadow-card"><Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm font-medium text-muted-foreground">Inga uppdrag matchar filtren</p><Button size="sm" variant="outline" className="mt-4" onClick={() => { setStatusFilter('all'); setDriverFilter('all'); setSearch(''); }}>Rensa filter</Button></div>
        ) : (
          <>
            <div className="hidden md:block bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead><TableHead>ID</TableHead><TableHead>Uppdrag</TableHead><TableHead>Rutt</TableHead><TableHead>Tid</TableHead><TableHead>Chaufför</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <StaggeredTableBody>
                  {filtered.map((a: any) => (
                    <StaggeredTableRow key={a.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/admin/assignments/${a.id}`)}>
                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggleSelect(a.id)} /></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.id.slice(0, 6).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="space-y-1"><div className="flex items-center gap-2"><span className="font-semibold text-sm">{a.title}</span>{a.service_type && <Badge variant="outline" className="text-[10px]">{a.service_type}</Badge>}{a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}</div><p className="text-xs text-muted-foreground">{a.customer?.name || 'Ingen kund'}</p></div>
                      </TableCell>
                      <TableCell className="max-w-[280px]"><div className="flex items-start gap-2 text-sm text-muted-foreground"><Route className="mt-0.5 h-4 w-4 shrink-0" /><span className="line-clamp-2">{getRouteSummary(a)}</span></div></TableCell>
                      <TableCell className="font-mono text-sm">{formatSwedishDateTime(a.scheduled_start)}</TableCell>
                      <TableCell>{a.driver ? <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><span className="text-[9px] font-bold text-blue-700">{a.driver.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span></div><span className="text-sm">{a.driver.full_name}</span></div> : <span className="inline-flex items-center gap-1 text-sm text-amber-700"><UserX className="h-3.5 w-3.5" /> Saknar förare</span>}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate(`/admin/assignments/${a.id}`)}>Redigera</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/admin/assignments/new', { state: { copy: a } })}>Kopiera</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => { updateAssignment.mutate({ id: a.id, status: 'cancelled' } as any); toast.success('Uppdraget avbokat'); }}>Avboka</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                    </StaggeredTableRow>
                  ))}
                </StaggeredTableBody>
              </Table>
            </div>

            <StaggeredList className="md:hidden space-y-3">
              {filtered.map((a: any) => (
                <StaggeredItem key={a.id}>
                  <Link to={`/admin/assignments/${a.id}`} className="block bg-card rounded-lg border border-border p-4 shadow-card active:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-sm text-foreground truncate">{a.title}</p>{a.service_type && <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{a.service_type}</span>}</div><p className="text-sm text-muted-foreground mt-0.5">{a.customer?.name}</p></div><StatusBadge status={a.status} /></div>
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{getRouteSummary(a)}</p>
                    <div className="flex items-center justify-between mt-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span className="font-mono text-xs">{formatSwedishTime(a.scheduled_start)}</span></div>{a.driver ? <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-[8px] font-bold text-blue-700">{a.driver.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span></div><span className="text-xs text-muted-foreground">{a.driver.full_name}</span></div> : <span className="text-xs text-amber-700">Saknar förare</span>}</div>
                  </Link>
                </StaggeredItem>
              ))}
            </StaggeredList>
          </>
        )}

        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Tilldela chaufför till {selected.length} uppdrag</DialogTitle></DialogHeader><Select onValueChange={(v) => { const driver = (drivers ?? []).find(d => d.id === v); bulkAssign.mutate({ assignmentIds: selected, driverId: v }, { onSuccess: () => { toast.success(`${selected.length} uppdrag tilldelade ${driver?.full_name}`); setSelected([]); setBulkDialogOpen(false); } }); }}><SelectTrigger><SelectValue placeholder="Välj chaufför" /></SelectTrigger><SelectContent>{(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent></Select></DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
