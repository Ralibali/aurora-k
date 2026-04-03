import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDrivers, useAssignments, useDriverCompensations, useUpsertDriverCompensation } from '@/hooks/useData';
import { Plus, Trash2, DollarSign, Save, Search, Phone, Briefcase, Users, Copy, Send, X, Clock, Mail, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

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

/* ── Compensation Dialog ── */
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

/* ── Invite Modal ── */
interface InviteRow { name: string; email: string }

function InviteModal({ companyId, companyName, adminName }: { companyId: string; companyName: string; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InviteRow[]>([{ name: '', email: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ email: string; token: string }[] | null>(null);
  const qc = useQueryClient();

  const addRow = () => setRows(prev => [...prev, { name: '', email: '' }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof InviteRow, val: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.email.trim());
    if (valid.length === 0) { toast.error('Ange minst en e-postadress'); return; }
    setSubmitting(true);

    try {
      const inserted: { email: string; token: string }[] = [];
      for (const inv of valid) {
        const { data, error } = await supabase.from('invitations').insert({
          company_id: companyId,
          email: inv.email.trim(),
          name: inv.name.trim() || null,
        }).select('email, token').single();

        if (error) throw error;
        if (data) inserted.push({ email: data.email, token: data.token! });
      }

      setResults(inserted);
      toast.success(`Inbjudan skickad till ${inserted.length} förare`);
      qc.invalidateQueries({ queryKey: ['invitations'] });
    } catch (err: any) {
      toast.error('Kunde inte skicka: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Länk kopierad!');
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRows([{ name: '', email: '' }]);
      setResults(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Bjud in förare</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bjud in förare</DialogTitle></DialogHeader>

        {results ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Dela länkarna nedan med dina förare:</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{window.location.origin}/join?token={r.token}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyLink(r.token)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>Stäng</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Skicka inbjudningar via e-post så kan de registrera sig direkt.</p>
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input placeholder="Namn" value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} className="flex-1 h-10" />
                  <Input type="email" placeholder="E-post" value={row.email} onChange={e => updateRow(i, 'email', e.target.value)} className="flex-1 h-10" />
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="mt-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addRow} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              <Plus className="h-3.5 w-3.5" /> Lägg till fler
            </button>
            <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
              <Send className="h-4 w-4 mr-1" /> {submitting ? 'Skickar...' : 'Skicka inbjudningar'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Driver Detail Sheet ── */
function DriverDetailSheet({
  driver, assignments: allAssignments, onClose
}: {
  driver: any;
  assignments: any[];
  onClose: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const todayAssignments = (allAssignments ?? []).filter(
    a => a.assigned_driver_id === driver.id && a.scheduled_start.startsWith(today)
  );

  const weekAssignments = (allAssignments ?? []).filter(
    a => a.assigned_driver_id === driver.id && a.scheduled_start >= weekStartStr
  );

  const weekHours = weekAssignments.reduce((sum, a) => {
    if (a.actual_start && a.actual_stop) {
      return sum + (new Date(a.actual_stop).getTime() - new Date(a.actual_start).getTime()) / 3600000;
    }
    return sum;
  }, 0);

  const [deactivating, setDeactivating] = useState(false);
  const qc = useQueryClient();

  const handleDeactivate = async () => {
    if (!confirm(`Är du säker på att du vill inaktivera ${driver.full_name}?`)) return;
    setDeactivating(true);
    try {
      await supabase.from('profiles').update({ is_available: false }).eq('id', driver.id);
      toast.success(`${driver.full_name} har inaktiverats`);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      onClose();
    } catch {
      toast.error('Kunde inte inaktivera');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(driver.full_name)}`}>
              {getInitials(driver.full_name)}
            </div>
            {driver.full_name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{driver.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Ansluten {format(new Date(driver.created_at), 'd MMM yyyy', { locale: sv })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>Förare</span>
            </div>
          </div>

          {/* Week hours */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Denna veckas timmar</p>
            <p className="text-2xl font-mono font-bold">{weekHours.toFixed(1)}h</p>
          </div>

          {/* Today's assignments */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Dagens uppdrag ({todayAssignments.length})</h4>
            {todayAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga uppdrag idag</p>
            ) : (
              <div className="space-y-2">
                {todayAssignments.map(a => (
                  <div key={a.id} className="bg-card border rounded-lg p-3">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.address}</p>
                    <Badge variant={a.status === 'completed' ? 'default' : a.status === 'active' ? 'secondary' : 'outline'} className="mt-1 text-xs">
                      {a.status === 'completed' ? 'Slutfört' : a.status === 'active' ? 'Aktiv' : 'Planerat'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deactivate */}
          <div className="pt-4 border-t">
            <Button variant="destructive" className="w-full" onClick={handleDeactivate} disabled={deactivating}>
              {deactivating ? 'Inaktiverar...' : 'Inaktivera konto'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  const { companyId } = useAuth();
  const { data: drivers, isLoading } = useDrivers();
  const { data: assignments } = useAssignments();
  const { data: compensations } = useDriverCompensations();
  const qc = useQueryClient();

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ['invitations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!companyId,
  });

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

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?token=${token}`);
    toast.success('Länk kopierad!');
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
            {companyId && <InviteModal companyId={companyId} />}
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
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
          <div className="bg-card rounded-lg border border-dashed border-border p-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
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
                <div
                  key={driver.id}
                  className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDriver(driver)}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(driver.full_name)}`}>
                        {getInitials(driver.full_name)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                        isActive ? 'bg-green-500' : driver.is_available ? 'bg-blue-500' : 'bg-muted-foreground/30'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{driver.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{driver.email}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : driver.is_available
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? 'bg-green-500' : driver.is_available ? 'bg-blue-500' : 'bg-muted-foreground/50'
                      }`} />
                      {isActive ? 'Aktiv' : driver.is_available ? 'Ledig' : 'Offline'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {todayH > 0 ? `${todayH.toFixed(1)}h idag` : '–'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
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

        {/* Pending Invitations */}
        {(invitations ?? []).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Väntande inbjudningar</h3>
            <div className="bg-card rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>E-post</TableHead>
                    <TableHead>Skickad</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invitations ?? []).map(inv => {
                    const accepted = !!inv.accepted_at;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.name || '–'}</TableCell>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.created_at ? format(new Date(inv.created_at), 'd MMM yyyy', { locale: sv }) : '–'}
                        </TableCell>
                        <TableCell>
                          {accepted ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Accepterad</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Väntar</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!accepted && inv.token && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => copyInviteLink(inv.token!)}>
                              <Copy className="h-3.5 w-3.5 mr-1" /> Kopiera länk
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Driver Detail Sheet */}
      {selectedDriver && (
        <DriverDetailSheet
          driver={selectedDriver}
          assignments={assignments ?? []}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </AdminLayout>
  );
}
