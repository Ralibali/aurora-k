import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDrivers, useAssignments, useDriverCompensations, useUpsertDriverCompensation } from '@/hooks/useData';
import { Plus, DollarSign, Save, Search, Briefcase, Users, Mail, Calendar, Send, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoDriversFull } from '@/lib/demo-data';

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

/* ── Create Driver Modal ── */
function CreateDriverModal({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Fyll i alla fält');
      return;
    }
    if (password.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-driver', {
        body: { email: email.trim(), full_name: name.trim(), password, company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${name.trim()} har registrerats som förare`);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setOpen(false);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      toast.error('Kunde inte skapa förare: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Lägg till förare</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrera ny förare</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Skapa ett konto åt föraren direkt. De kan logga in med uppgifterna du anger.</p>
          <div className="space-y-2">
            <Label>Namn</Label>
            <Input placeholder="Förnamn Efternamn" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-post</Label>
            <Input type="email" placeholder="forare@exempel.se" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Lösenord</Label>
            <Input type="text" placeholder="Minst 6 tecken" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            <Plus className="h-4 w-4 mr-1" /> {submitting ? 'Skapar...' : 'Skapa förarkonto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Invite Driver Modal ── */
function InviteDriverModal({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error('Ange en e-postadress');
      return;
    }

    setSubmitting(true);
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('invitations')
        .insert({
          company_id: companyId,
          email: email.trim(),
          name: name.trim() || null,
        })
        .select('token')
        .single();

      if (insertErr || !inserted?.token) throw insertErr || new Error('Kunde inte skapa inbjudan');

      const joinUrl = `${window.location.origin}/join?token=${inserted.token}`;
      const adminName = user?.user_metadata?.full_name || 'Admin';

      // Get company name
      const { data: settings } = await supabase
        .from('settings')
        .select('company_name')
        .eq('company_id', companyId)
        .maybeSingle();

      await supabase.functions.invoke('send-email', {
        body: {
          to: email.trim(),
          templateName: 'driver-invite',
          templateData: {
            adminName,
            companyName: settings?.company_name || 'Ditt företag',
            joinUrl,
          },
        },
      });

      toast.success(`Inbjudan skickad till ${email.trim()}`);
      setOpen(false);
      setName('');
      setEmail('');
    } catch (err: any) {
      toast.error('Kunde inte skicka inbjudan: ' + (err?.message || 'Okänt fel'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Send className="h-4 w-4 mr-1" /> Bjud in</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Bjud in förare via e-post</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Skicka en inbjudningslänk via e-post. Föraren skapar sitt eget konto.</p>
          <div className="space-y-2">
            <Label>Namn (valfritt)</Label>
            <Input placeholder="Förnamn Efternamn" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-post</Label>
            <Input type="email" placeholder="forare@exempel.se" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            <Send className="h-4 w-4 mr-1" /> {submitting ? 'Skickar...' : 'Skicka inbjudan'}
          </Button>
        </div>
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

/* ── Invitations List ── */
function InvitationsList({ companyId }: { companyId: string }) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInvitations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setInvitations(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchInvitations(); }, [companyId]);

  const handleResend = async (inv: any) => {
    setResending(inv.id);
    try {
      const joinUrl = `${window.location.origin}/join?token=${inv.token}`;
      const adminName = user?.user_metadata?.full_name || 'Admin';
      const { data: settings } = await supabase
        .from('settings')
        .select('company_name')
        .eq('company_id', companyId)
        .maybeSingle();

      await supabase.functions.invoke('send-email', {
        body: {
          to: inv.email,
          templateName: 'driver-invite',
          templateData: {
            adminName,
            companyName: settings?.company_name || 'Ditt företag',
            joinUrl,
          },
        },
      });
      toast.success(`Inbjudan skickad igen till ${inv.email}`);
    } catch {
      toast.error('Kunde inte skicka om inbjudan');
    } finally {
      setResending(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center">
        <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Inga inbjudningar skickade ännu</p>
      </div>
    );
  }

  const pending = invitations.filter(i => !i.accepted_at);
  const accepted = invitations.filter(i => i.accepted_at);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Väntande ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map(inv => (
              <div key={inv.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.name || inv.email}</p>
                  {inv.name && <p className="text-xs text-muted-foreground truncate">{inv.email}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Skickad {format(new Date(inv.created_at), 'd MMM yyyy, HH:mm', { locale: sv })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    Väntande
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(inv)}
                    disabled={resending === inv.id}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${resending === inv.id ? 'animate-spin' : ''}`} />
                    Skicka igen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Accepterade ({accepted.length})
          </h4>
          <div className="space-y-2">
            {accepted.map(inv => (
              <div key={inv.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.name || inv.email}</p>
                  {inv.name && <p className="text-xs text-muted-foreground truncate">{inv.email}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Accepterad {format(new Date(inv.accepted_at), 'd MMM yyyy, HH:mm', { locale: sv })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  Accepterad
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDrivers() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('drivers');

  const { companyId } = useAuth();
  const { data: drivers, isLoading } = useDrivers();
  const { data: assignments } = useAssignments();
  const { data: compensations } = useDriverCompensations();
  const qc = useQueryClient();
  const { enabled: demoEnabled } = useDemoMode();

  const effectiveDrivers = (demoEnabled && (drivers?.length ?? 0) === 0)
    ? (demoDriversFull as any)
    : (drivers ?? []);
  const showingDemo = demoEnabled && (drivers?.length ?? 0) === 0;

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
    let list = effectiveDrivers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d: any) => d.full_name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
    }
    if (filter === 'available') list = list.filter((d: any) => d.is_available);
    else if (filter === 'active') list = list.filter((d: any) => driverStats.get(d.id)?.activeToday);
    else if (filter === 'inactive') list = list.filter((d: any) => !driverStats.get(d.id)?.todayCount);
    return list;
  }, [effectiveDrivers, search, filter, driverStats]);

  const getCompensation = (driverId: string) => (compensations ?? []).find(c => c.driver_id === driverId);

  return (
    <AdminLayout title="Chaufförer" description="Hantera chaufförer och deras tillgänglighet">
      <div className="space-y-6">
        {showingDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Demo-läge — visar exempelchaufförer. Klicka <strong>Lägg till förare</strong> eller <strong>Bjud in</strong> för att lägga upp ditt riktiga team.
          </div>
        )}
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Chaufförer</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök chaufför..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[200px]" />
            </div>
            {companyId ? (
              <>
                <InviteDriverModal companyId={companyId} />
                <CreateDriverModal companyId={companyId} />
              </>
            ) : (
              <Button disabled><Plus className="h-4 w-4 mr-1" /> Lägg till förare</Button>
            )}
          </div>
        </div>

        {/* Tabs: Drivers / Invitations */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="drivers" className="gap-1.5">
              <Users className="h-4 w-4" /> Chaufförer
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1.5">
              <Mail className="h-4 w-4" /> Inbjudningar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="mt-4">
            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap mb-4">
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
                  onClick={() => !showingDemo && setSelectedDriver(driver)}
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
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            {companyId ? (
              <InvitationsList companyId={companyId} />
            ) : (
              <p className="text-sm text-muted-foreground">Inget företag kopplat</p>
            )}
          </TabsContent>
        </Tabs>
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
