import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers, useDrivers } from '@/hooks/useData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Trash2, Pencil, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Series = Database['public']['Tables']['recurring_assignment_series']['Row'];
type Frequency = 'daily' | 'weekly' | 'monthly';

const WEEKDAYS = [
  { v: 1, l: 'Mån' }, { v: 2, l: 'Tis' }, { v: 3, l: 'Ons' },
  { v: 4, l: 'Tor' }, { v: 5, l: 'Fre' }, { v: 6, l: 'Lör' }, { v: 0, l: 'Sön' },
];

function frequencyLabel(s: Series): string {
  if (s.frequency === 'daily') return 'Varje dag';
  if (s.frequency === 'weekly') {
    const days = (s.weekdays ?? []).map(w => WEEKDAYS.find(d => d.v === w)?.l).filter(Boolean).join(', ');
    return days ? `Vecka: ${days}` : 'Veckovis (inga dagar)';
  }
  if (s.frequency === 'monthly') return `Månad: dag ${s.day_of_month ?? '?'}`;
  return s.frequency;
}

type FormState = {
  id?: string;
  title: string;
  address: string;
  customer_id: string;
  assigned_driver_id: string;
  instructions: string;
  priority: 'low' | 'normal' | 'urgent';
  scheduled_time: string;
  duration_minutes: number;
  frequency: Frequency;
  weekdays: number[];
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
};

const emptyForm = (): FormState => ({
  title: '', address: '', customer_id: '', assigned_driver_id: '',
  instructions: '', priority: 'normal',
  scheduled_time: '08:00', duration_minutes: 60,
  frequency: 'weekly', weekdays: [1, 2, 3, 4, 5], day_of_month: null,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null, active: true,
});

export default function AdminRecurringSeries() {
  const { companyId } = useAuth();
  const qc = useQueryClient();
  const { data: customers } = useCustomers();
  const { data: drivers } = useDrivers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [generating, setGenerating] = useState(false);

  const { data: series, isLoading } = useQuery({
    queryKey: ['recurring-series', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_assignment_series')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (f: FormState) => {
      if (!companyId) throw new Error('Ingen company_id');
      const payload = {
        company_id: companyId,
        customer_id: f.customer_id,
        assigned_driver_id: f.assigned_driver_id,
        title: f.title.trim(),
        address: f.address.trim(),
        instructions: f.instructions.trim() || null,
        priority: f.priority,
        scheduled_time: f.scheduled_time,
        duration_minutes: f.duration_minutes,
        frequency: f.frequency,
        weekdays: f.frequency === 'weekly' ? f.weekdays : [],
        day_of_month: f.frequency === 'monthly' ? f.day_of_month : null,
        start_date: f.start_date,
        end_date: f.end_date,
        active: f.active,
      };
      if (f.id) {
        const { error } = await supabase.from('recurring_assignment_series').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('recurring_assignment_series').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? 'Serie uppdaterad' : 'Serie skapad');
      qc.invalidateQueries({ queryKey: ['recurring-series'] });
      setDialogOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_assignment_series').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Serie borttagen');
      qc.invalidateQueries({ queryKey: ['recurring-series'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('recurring_assignment_series').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-series'] }),
  });

  const generate = async (seriesId?: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recurring-assignments', {
        body: { horizon_days: 14, ...(seriesId ? { series_id: seriesId } : {}) },
      });
      if (error) throw error;
      toast.success(`${data?.generated ?? 0} uppdrag genererade (${data?.considered ?? 0} kandidater, dubbletter hoppas över)`);
      qc.invalidateQueries({ queryKey: ['assignments'] });
    } catch (e) {
      toast.error(`Kunde inte generera: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (s: Series) => {
    setForm({
      id: s.id,
      title: s.title,
      address: s.address,
      customer_id: s.customer_id,
      assigned_driver_id: s.assigned_driver_id,
      instructions: s.instructions ?? '',
      priority: (s.priority as FormState['priority']) ?? 'normal',
      scheduled_time: (s.scheduled_time ?? '08:00').slice(0, 5),
      duration_minutes: s.duration_minutes ?? 60,
      frequency: s.frequency as Frequency,
      weekdays: (s.weekdays as number[]) ?? [],
      day_of_month: s.day_of_month ?? null,
      start_date: s.start_date,
      end_date: s.end_date,
      active: s.active,
    });
    setDialogOpen(true);
  };

  const openNew = () => { setForm(emptyForm()); setDialogOpen(true); };
  const toggleWeekday = (v: number) => setForm(f => ({
    ...f, weekdays: f.weekdays.includes(v) ? f.weekdays.filter(w => w !== v) : [...f.weekdays, v].sort(),
  }));

  return (
    <AdminLayout title="Återkommande uppdrag" description="Regler som automatiskt genererar körningar 14 dagar framåt">
      <div className="space-y-5 max-w-6xl">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Ny serie</Button>
          <Button variant="outline" onClick={() => generate()} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} /> Generera nu (alla serier)
          </Button>
        </div>

        <div className="admin-table-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Kund</TableHead>
                <TableHead>Förare</TableHead>
                <TableHead>Frekvens</TableHead>
                <TableHead>Tid</TableHead>
                <TableHead>Aktiv</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Laddar...</TableCell></TableRow>
              )}
              {!isLoading && (series?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <p className="font-medium text-foreground mb-1">Inga återkommande serier ännu</p>
                  <p className="text-sm">Skapa en regel så genereras uppdrag automatiskt varje dag 14 dagar framåt.</p>
                </TableCell></TableRow>
              )}
              {series?.map(s => {
                const customer = customers?.find(c => c.id === s.customer_id);
                const driver = drivers?.find(d => d.id === s.assigned_driver_id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{customer?.name ?? '–'}</TableCell>
                    <TableCell>{driver?.full_name ?? '–'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{frequencyLabel(s)}</TableCell>
                    <TableCell className="font-mono text-sm">{s.scheduled_time?.slice(0, 5)} · {s.duration_minutes}min</TableCell>
                    <TableCell>
                      <Switch checked={s.active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, active: v })} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => generate(s.id)} disabled={generating} title="Generera nu">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Ta bort serien "${s.title}"? Redan genererade uppdrag behålls.`)) remove.mutate(s.id);
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground border rounded p-3 bg-muted/30">
          <strong>Idempotens:</strong> uppdrag är unika per (serie, datum). Klicka "Generera nu" flera gånger — redan skapade dagar hoppas över.
          Sätt upp en cron (t.ex. Codemagic-schemalagd webhook eller pg_cron) som kallar edge-funktionen dagligen så håller sig 14-dagars horisonten fylld automatiskt.
        </div>

        <GenerationRunsPanel />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Redigera serie' : 'Ny återkommande serie'}</DialogTitle>
            <DialogDescription>Regeln genererar uppdrag 14 dagar framåt varje gång cron körs.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Titel</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Morgontur City" />
              </div>
              <div>
                <Label>Prioritet</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as FormState['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Låg</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Brådskande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Adress</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kund</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger>
                  <SelectContent>{customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Förare</Label>
                <Select value={form.assigned_driver_id} onValueChange={(v) => setForm({ ...form, assigned_driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Välj förare" /></SelectTrigger>
                  <SelectContent>{drivers?.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starttid</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />
              </div>
              <div>
                <Label>Längd (min)</Label>
                <Input type="number" min={5} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label>Frekvens</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Varje dag</SelectItem>
                  <SelectItem value="weekly">Veckovis</SelectItem>
                  <SelectItem value="monthly">Månadsvis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.frequency === 'weekly' && (
              <div>
                <Label>Veckodagar</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WEEKDAYS.map(d => (
                    <Button key={d.v} type="button" size="sm"
                      variant={form.weekdays.includes(d.v) ? 'default' : 'outline'}
                      onClick={() => toggleWeekday(d.v)}>{d.l}</Button>
                  ))}
                </div>
              </div>
            )}

            {form.frequency === 'monthly' && (
              <div>
                <Label>Dag i månaden (1–31)</Label>
                <Input type="number" min={1} max={31} value={form.day_of_month ?? ''}
                  onChange={e => setForm({ ...form, day_of_month: Number(e.target.value) || null })} />
                <p className="text-xs text-muted-foreground mt-1">Om månaden har färre dagar används sista dagen.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startdatum</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Slutdatum (valfritt)</Label>
                <Input type="date" value={form.end_date ?? ''} onChange={e => setForm({ ...form, end_date: e.target.value || null })} />
              </div>
            </div>

            <div>
              <Label>Instruktioner</Label>
              <Textarea rows={2} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Aktiv</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button
              onClick={() => upsert.mutate(form)}
              disabled={
                upsert.isPending || !form.title || !form.address || !form.customer_id || !form.assigned_driver_id ||
                (form.frequency === 'weekly' && form.weekdays.length === 0) ||
                (form.frequency === 'monthly' && !form.day_of_month)
              }
            >
              {upsert.isPending ? 'Sparar...' : 'Spara'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

type RunRow = {
  id: string;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  generated: number;
  considered: number;
  series_count: number;
  horizon_days: number | null;
  status: 'success' | 'error';
  error: string | null;
};

function GenerationRunsPanel() {
  const { data: runs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recurring-generation-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_generation_runs')
        .select('id, triggered_by, started_at, finished_at, generated, considered, series_count, horizon_days, status, error')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RunRow[];
    },
    refetchInterval: 30_000,
  });

  const last = runs?.[0];
  const lastSuccess = runs?.find((r) => r.status === 'success');
  const lastError = runs?.find((r) => r.status === 'error');

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-sm font-semibold">Genereringshistorik</h3>
          <p className="text-xs text-muted-foreground">Senaste 20 körningarna av generatorn (cron + manuella).</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Uppdatera
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-b bg-muted/20">
        <div>
          <div className="text-xs text-muted-foreground">Senaste körning</div>
          <div className="text-sm font-medium">
            {last ? formatDistanceToNow(new Date(last.started_at), { addSuffix: true, locale: sv }) : '—'}
          </div>
          {last && (
            <div className="text-xs text-muted-foreground">
              via {last.triggered_by} · {last.status === 'success' ? `${last.generated} nya` : 'fel'}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Senaste lyckade</div>
          <div className="text-sm font-medium">
            {lastSuccess ? formatDistanceToNow(new Date(lastSuccess.started_at), { addSuffix: true, locale: sv }) : '—'}
          </div>
          {lastSuccess && (
            <div className="text-xs text-muted-foreground">
              {lastSuccess.generated} nya · {lastSuccess.series_count} serier · {lastSuccess.horizon_days}d
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Senaste fel</div>
          <div className="text-sm font-medium">
            {lastError ? formatDistanceToNow(new Date(lastError.started_at), { addSuffix: true, locale: sv }) : 'Inga fel'}
          </div>
          {lastError?.error && (
            <div className="text-xs text-destructive truncate" title={lastError.error}>
              {lastError.error}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Läser in…</div>
      ) : !runs?.length ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Ingen körning loggad ännu. Klicka "Generera nu" för att skapa den första posten.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Tid</TableHead>
              <TableHead>Källa</TableHead>
              <TableHead className="text-right">Skapade</TableHead>
              <TableHead className="text-right">Övervägda</TableHead>
              <TableHead className="text-right">Serier</TableHead>
              <TableHead>Fel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.status === 'success'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <XCircle className="h-4 w-4 text-destructive" />}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(r.started_at).toLocaleString('sv-SE')}
                </TableCell>
                <TableCell className="text-xs capitalize">{r.triggered_by}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.generated}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.considered}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.series_count}</TableCell>
                <TableCell className="text-xs text-destructive max-w-[240px] truncate" title={r.error ?? ''}>
                  {r.error ?? ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}