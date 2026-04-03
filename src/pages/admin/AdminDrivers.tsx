import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDrivers, useAssignments, useDriverCompensations, useUpsertDriverCompensation } from '@/hooks/useData';
import { Plus, Trash2, DollarSign, Save, Search, Phone, Briefcase, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const COMP_LABELS: Record<string, string> = {
  hourly: 'Timbaserad',
  per_assignment: 'Per uppdrag',
  monthly: 'Månadslön',
};

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600',
  'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Compensation Dialog (unchanged logic) ── */
function CompensationDialog({ driverId, driverName, existing }: { driverId: string; driverName: string; existing?: any }) {
  const [open, setOpen] = useState(false);
  const [compType, setCompType] = useState<'hourly' | 'per_assignment' | 'monthly'>(existing?.compensation_type ?? 'hourly');
  const [hourlyRate, setHourlyRate] = useState(String(existing?.hourly_rate ?? '0'));
  const [perAssignmentRate, setPerAssignmentRate] = useState(String(existing?.per_assignment_rate ?? '0'));
  const [monthlySalary, setMonthlySalary] = useState(String(existing?.monthly_salary ?? '0'));
  const [taxTable, setTaxTable] = useState(existing?.tax_table ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const upsert = useUpsertDriverCompensation();

  useEffect(() => {
    if (existing) {
      setCompType(existing.compensation_type ?? 'hourly');
      setHourlyRate(String(existing.hourly_rate ?? '0'));
      setPerAssignmentRate(String(existing.per_assignment_rate ?? '0'));
      setMonthlySalary(String(existing.monthly_salary ?? '0'));
      setTaxTable(existing.tax_table ?? '');
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  const handleSave = () => {
    upsert.mutate({
      driver_id: driverId, compensation_type: compType,
      hourly_rate: parseFloat(hourlyRate) || 0, per_assignment_rate: parseFloat(perAssignmentRate) || 0,
      monthly_salary: parseFloat(monthlySalary) || 0, tax_table: taxTable || null, notes: notes || null,
    }, {
      onSuccess: () => { toast.success(`Löneuppgifter sparade för ${driverName}`); setOpen(false); },
      onError: (err) => toast.error('Kunde inte spara: ' + err.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs"><DollarSign className="h-3.5 w-3.5 mr-1" /> Lön</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Löneuppgifter – {driverName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ersättningstyp</Label>
            <Select value={compType} onValueChange={(v) => setCompType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Timbaserad (kr/timme)</SelectItem>
                <SelectItem value="per_assignment">Per uppdrag (kr/uppdrag)</SelectItem>
                <SelectItem value="monthly">Månadslön (kr/månad)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {compType === 'hourly' && (
            <div className="space-y-2"><Label>Timpris (kr)</Label><Input type="number" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} /></div>
          )}
          {compType === 'per_assignment' && (
            <div className="space-y-2"><Label>Pris per uppdrag (kr)</Label><Input type="number" min="0" step="0.01" value={perAssignmentRate} onChange={e => setPerAssignmentRate(e.target.value)} /></div>
          )}
          {compType === 'monthly' && (
            <div className="space-y-2"><Label>Månadslön (kr)</Label><Input type="number" min="0" step="0.01" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} /></div>
          )}
          <div className="space-y-2"><Label>Skattetabell (valfritt)</Label><Input value={taxTable} onChange={e => setTaxTable(e.target.value)} placeholder="T.ex. Tabell 30, kolumn 1" /></div>
          <div className="space-y-2"><Label>Anteckningar (valfritt)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Extra löneinfo..." rows={3} /></div>
          <Button onClick={handleSave} className="w-full" disabled={upsert.isPending}>
            <Save className="h-4 w-4 mr-1" /> {upsert.isPending ? 'Sparar...' : 'Spara löneuppgifter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Filter pills ── */
const filters = [
  { key: 'all', label: 'Alla' },
  { key: 'available', label: 'Lediga' },
  { key: 'active', label: 'Aktiva' },
  { key: 'inactive', label: 'Ej inloggad idag' },
] as const;

export default function AdminDrivers() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: drivers, isLoading } = useDrivers();
  const { data: assignments } = useAssignments();
  const { data: compensations } = useDriverCompensations();
  const qc = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const driverStats = useMemo(() => {
    const map = new Map<string, { todayHours: number; activeToday: boolean; todayCount: number }>();
    (assignments ?? []).forEach(a => {
      if (!a.scheduled_start.startsWith(today)) return;
      const id = a.assigned_driver_id;
      const prev = map.get(id) || { todayHours: 0, activeToday: false, todayCount: 0 };
      prev.todayCount++;
      if (a.status === 'active') prev.activeToday = true;
      if (a.actual_start && a.actual_stop) {
        prev.todayHours += (new Date(a.actual_stop).getTime() - new Date(a.actual_start).getTime()) / 3600000;
      }
      map.set(id, prev);
    });
    return map;
  }, [assignments, today]);

  const filtered = useMemo(() => {
    let list = drivers ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => d.full_name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
    }
    if (filter === 'available') list = list.filter(d => d.is_available);
    else if (filter === 'active') list = list.filter(d => driverStats.get(d.id)?.activeToday);
    else if (filter === 'inactive') list = list.filter(d => !driverStats.get(d.id)?.todayCount);
    return list;
  }, [drivers, search, filter, driverStats]);

  const getCompensation = (driverId: string) => (compensations ?? []).find(c => c.driver_id === driverId);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-driver', {
        body: { email, full_name: name, password },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Chaufför ${name} skapad!`);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setName(''); setEmail(''); setPassword(''); setOpen(false);
    } catch (err: any) {
      toast.error('Kunde inte skapa chaufför: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout title="Chaufförer" description="Hantera chaufförer och deras tillgänglighet">
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Chaufförer</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök chaufför..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[200px]" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Bjud in förare</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Lägg till ny chaufför</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateDriver} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="driverName">Namn</Label><Input id="driverName" placeholder="Förnamn Efternamn" value={name} onChange={e => setName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label htmlFor="driverEmail">E-post</Label><Input id="driverEmail" type="email" placeholder="namn@exempel.se" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                  <div className="space-y-2"><Label htmlFor="driverPassword">Lösenord</Label><Input id="driverPassword" type="password" placeholder="Minst 6 tecken" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
                  <Button type="submit" className="w-full" disabled={creating}>{creating ? 'Skapar...' : 'Skapa chaufförskonto'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === f.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Driver grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-lg border border-dashed border-border p-16 text-center shadow-card">
            <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Inga chaufförer hittades</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(driver => {
              const stats = driverStats.get(driver.id);
              const comp = getCompensation(driver.id);
              const isActive = stats?.activeToday;
              const todayH = stats?.todayHours ?? 0;

              return (
                <div key={driver.id} className="bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-md transition-shadow">
                  {/* Avatar + status */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(driver.full_name)}`}>
                        {getInitials(driver.full_name)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isActive ? 'bg-green-500' : driver.is_available ? 'bg-blue-500' : 'bg-slate-300'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{driver.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{driver.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <a href={`tel:${driver.email}`} className="hover:text-primary transition-colors">{driver.email}</a>
                  </div>

                  {/* Status + hours */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-green-100 text-green-700'
                        : driver.is_available
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? 'bg-green-500' : driver.is_available ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      {isActive ? 'Aktiv' : driver.is_available ? 'Ledig' : 'Offline'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {todayH > 0 ? `${todayH.toFixed(1)}h idag` : '–'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" asChild>
                      <Link to={`/admin/assignments?driver=${driver.id}`}>
                        <Briefcase className="h-3.5 w-3.5 mr-1" /> Se uppdrag
                      </Link>
                    </Button>
                    <CompensationDialog driverId={driver.id} driverName={driver.full_name} existing={comp} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
