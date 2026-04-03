import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
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
import { Plus, Search, Users, Clock, ChevronRight, Inbox, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const filterTabs = [
  { key: 'all', label: 'Alla' },
  { key: 'pending', label: 'Ej tilldelade' },
  { key: 'active', label: 'Pågående' },
  { key: 'completed', label: 'Slutförda' },
  { key: 'delayed', label: 'Försenade' },
] as const;

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

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: sv });

  const filtered = useMemo(() =>
    (assignments ?? []).filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.customer?.name?.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.scheduled_start.localeCompare(a.scheduled_start)),
    [assignments, statusFilter, driverFilter, search]
  );

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(a => a.id));
  };

  return (
    <AdminLayout title="Uppdrag" description="Hantera och fördela uppdrag till chaufförer">
      <div className="space-y-5">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Uppdrag</h2>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök uppdrag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Chaufför" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla chaufförer</SelectItem>
                {(drivers ?? []).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link to="/admin/assignments/new">
                <Plus className="h-4 w-4 mr-1" /> Nytt uppdrag
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm whitespace-nowrap rounded-t-md transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-50 text-blue-700 font-medium border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk selection bar */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-700">{selected.length} valda</span>
            <Button size="sm" variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Users className="h-4 w-4 mr-1" /> Tilldela chaufför
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Avmarkera</Button>
          </div>
        )}

        {/* Desktop table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-lg border border-dashed border-border p-16 text-center shadow-card">
            <Inbox className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Inga uppdrag hittades</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Prova att ändra filter eller skapa ett nytt uppdrag</p>
            <Button size="sm" className="mt-4" asChild>
              <Link to="/admin/assignments/new"><Plus className="h-3.5 w-3.5 mr-1" /> Skapa uppdrag</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Kund</TableHead>
                    <TableHead>Datum & Tid</TableHead>
                    <TableHead>Adress</TableHead>
                    <TableHead>Chaufför</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => navigate(`/admin/assignments/${a.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(a.id)}
                          onCheckedChange={() => toggleSelect(a.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {a.id.slice(0, 6).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold text-sm">{a.customer?.name}</span>
                          {a.priority !== 'normal' && (
                            <span className="ml-2"><PriorityBadge priority={a.priority} /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatSwedishDateTime(a.scheduled_start)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {a.address}
                      </TableCell>
                      <TableCell>
                        {a.driver ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-blue-700">
                                {a.driver.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <span className="text-sm">{a.driver.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Ej tilldelad</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/assignments/${a.id}`)}>
                              Redigera
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigate('/admin/assignments/new', { state: { copy: a } });
                            }}>
                              Kopiera
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                updateAssignment.mutate({ id: a.id, status: 'cancelled' } as any);
                                toast.success('Uppdraget avbokat');
                              }}
                            >
                              Avboka
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {filtered.map(a => (
                <Link
                  key={a.id}
                  to={`/admin/assignments/${a.id}`}
                  className="block bg-card rounded-lg border border-border p-4 shadow-card active:bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{a.customer?.name}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-mono text-xs">{formatSwedishTime(a.scheduled_start)}</span>
                    </div>
                    {a.driver && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-blue-700">
                            {a.driver.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{a.driver.full_name}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Bulk assign dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tilldela chaufför till {selected.length} uppdrag</DialogTitle>
            </DialogHeader>
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
                {(drivers ?? []).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
