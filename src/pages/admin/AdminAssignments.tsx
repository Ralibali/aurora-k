import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignments, useDrivers, useBulkAssignDriver, useUpdateAssignment } from '@/hooks/useData';
import { formatSwedishDateTime } from '@/lib/format';
import { Plus, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Idag – ${format(date, 'EEEE d MMMM', { locale: sv })}`;
  if (isTomorrow(date)) return `Imorgon – ${format(date, 'EEEE d MMMM', { locale: sv })}`;
  if (isPast(date)) return `Tidigare – ${format(date, 'EEEE d MMMM', { locale: sv })}`;
  return format(date, 'EEEE d MMMM', { locale: sv });
}

function DateGroupedAssignments({ filtered, isLoading, selected, toggleSelect, toggleAll, drivers, navigate, updateAssignment }: any) {
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of filtered) {
      const dayKey = a.scheduled_start.split('T')[0];
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  if (filtered.length === 0) return <p className="text-center text-muted-foreground py-8">Inga uppdrag hittades</p>;

  return (
    <div className="space-y-1">
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-2 mb-2">
          <Checkbox checked={selected.length === filtered.length} onCheckedChange={toggleAll} />
          <span className="text-xs text-muted-foreground">Markera alla</span>
        </div>
      )}
      {groups.map(([dayKey, items]) => (
        <div key={dayKey}>
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 z-10 mb-2">
            {getDateLabel(dayKey)}
          </div>
          <div className="space-y-2 mb-4">
            {items.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2">
                <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggleSelect(a.id)} />
                <Card
                  className="flex-1 hover:shadow-md hover:border-primary/20 transition-all duration-150 cursor-pointer"
                  onClick={() => navigate(`/admin/assignments/${a.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium truncate">{a.title}</p>
                          <StatusBadge status={a.status} />
                          {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                          {a.invoiced && <span className="status-badge bg-primary/10 text-primary">Fakturerad</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.customer?.name} · {a.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{formatSwedishDateTime(a.scheduled_start)}</p>
                          <span className="text-xs text-muted-foreground">·</span>
                          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Select
                              value={a.assigned_driver_id}
                              onValueChange={(driverId: string) => {
                                updateAssignment.mutate({ id: a.id, assigned_driver_id: driverId });
                              }}
                            >
                              <SelectTrigger className="h-6 text-xs border-none bg-transparent p-0 w-auto gap-1 shadow-none focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers.map((d: any) => (
                                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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

  const filtered = (assignments ?? []).filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(a => a.id));
  };

  return (
    <AdminLayout title="Uppdragshantering" description="Hantera och fördela uppdrag till chaufförer">
      <div className="space-y-5 max-w-6xl">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök uppdrag..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="pending">Ej startad</SelectItem>
              <SelectItem value="active">Pågår</SelectItem>
              <SelectItem value="completed">Klar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Chaufför" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla chaufförer</SelectItem>
              {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button asChild><Link to="/admin/assignments/new"><Plus className="h-4 w-4 mr-1" /> Nytt uppdrag</Link></Button>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
            <span className="text-sm font-medium">{selected.length} valda</span>
            <Button size="sm" variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Users className="h-4 w-4 mr-1" /> Tilldela chaufför
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Avmarkera</Button>
          </div>
        )}

        <DateGroupedAssignments
          filtered={filtered}
          isLoading={isLoading}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          drivers={drivers ?? []}
          navigate={navigate}
          updateAssignment={updateAssignment}
        />

        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Tilldela chaufför till {selected.length} uppdrag</DialogTitle></DialogHeader>
            <Select onValueChange={(v) => {
              const driver = (drivers ?? []).find(d => d.id === v);
              bulkAssign.mutate({ assignmentIds: selected, driverId: v }, {
                onSuccess: () => {
                  toast.success(`${selected.length} uppdrag tilldelade ${driver?.full_name}`);
                  setSelected([]);
                  setBulkDialogOpen(false);
                }
              });
            }}>
              <SelectTrigger><SelectValue placeholder="Välj chaufför" /></SelectTrigger>
              <SelectContent>
                {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
