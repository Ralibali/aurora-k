import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, CalendarDays, MapPin, Route, Save, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoDrivers, demoRouteStops } from '@/lib/demo-data';
import { moveStop, optimizeRoute } from '@/features/routes/route-order';
import { supabase } from '@/integrations/supabase/client';

const RouteMapLeaflet = lazy(() => import('../AdminRouteMapLeaflet'));

type RouteAssignment = {
  id: string;
  title: string;
  address: string;
  status: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  assigned_driver_id?: string | null;
  route_sequence?: number | null;
  geofence_lat?: number | null;
  geofence_lng?: number | null;
};

export default function AdminRouteOptimizerPage() {
  const { data: assignments } = useAssignments();
  const { data: drivers } = useDrivers();
  const { enabled: demoEnabled } = useDemoMode();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const effectiveDrivers = demoEnabled && (!drivers || drivers.length === 0) ? demoDrivers : (drivers ?? []);

  const availableAssignments = useMemo(() => {
    if (!selectedDriver) return [];
    return (assignments ?? [])
      .filter(item => item.assigned_driver_id === selectedDriver && item.scheduled_start.startsWith(selectedDate) && item.status !== 'completed')
      .map(item => item as RouteAssignment)
      .sort((a, b) => (a.route_sequence ?? 9999) - (b.route_sequence ?? 9999) || a.scheduled_start.localeCompare(b.scheduled_start));
  }, [assignments, selectedDate, selectedDriver]);

  useEffect(() => {
    setOrderedIds(availableAssignments.map(item => item.id));
  }, [availableAssignments]);

  const orderedAssignments = orderedIds
    .map(id => availableAssignments.find(item => item.id === id))
    .filter((item): item is RouteAssignment => Boolean(item));
  const showDemoExample = demoEnabled && orderedAssignments.length === 0;

  const optimize = () => {
    const next = optimizeRoute(orderedAssignments);
    setOrderedIds(next.map(item => item.id));
    const withCoordinates = orderedAssignments.filter(item => item.geofence_lat != null && item.geofence_lng != null).length;
    toast.success(withCoordinates >= 2 ? 'Körordningen optimerades efter närmaste stopp.' : 'Stopp utan koordinater sorterades efter planerad tid.');
  };

  const save = async () => {
    if (!orderedAssignments.length) return;
    setSaving(true);
    try {
      const results = await Promise.all(orderedAssignments.map((item, index) =>
        supabase.from('assignments').update({ route_sequence: index + 1 } as never).eq('id', item.id),
      ));
      const failure = results.find(result => result.error);
      if (failure?.error) throw failure.error;
      toast.success('Körordningen sparades och visas för föraren.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte spara körordningen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Slingor och ruttplanering" description="Ordna och spara dagens stopp till föraren">
      <div className="space-y-5">
        <Card className="border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card"><CardContent className="p-6"><div className="flex gap-3"><div className="rounded-xl bg-primary/10 p-2.5"><Route className="h-5 w-5 text-primary" /></div><div><h2 className="font-bold">Verklig körordning</h2><p className="mt-1 text-sm text-muted-foreground">Optimera efter koordinater, flytta stopp manuellt och spara ordningen. Stopp utan koordinater sorteras efter planerad tid.</p></div></div></CardContent></Card>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><label className="text-sm font-medium">Chaufför</label><Select value={selectedDriver} onValueChange={setSelectedDriver}><SelectTrigger className="w-[220px]"><SelectValue placeholder="Välj chaufför" /></SelectTrigger><SelectContent>{effectiveDrivers.map(driver => <SelectItem key={driver.id} value={driver.id}>{driver.full_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Datum</label><input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          <Button variant="outline" onClick={optimize} disabled={orderedAssignments.length < 2}><Sparkles className="mr-1 h-4 w-4" /> Optimera</Button>
          <Button onClick={save} disabled={!orderedAssignments.length || saving || showDemoExample}><Save className="mr-1 h-4 w-4" /> {saving ? 'Sparar…' : 'Spara körordning'}</Button>
        </div>

        {!selectedDriver && !showDemoExample && <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>Välj chaufför och datum.</p></CardContent></Card>}
        {selectedDriver && orderedAssignments.length === 0 && !showDemoExample && <Card><CardContent className="py-12 text-center text-muted-foreground"><CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>Inga aktiva uppdrag för vald dag.</p></CardContent></Card>}

        {showDemoExample && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm">Exempelrutt <Badge variant="secondary">Demo</Badge></CardTitle></CardHeader><CardContent className="space-y-2">{demoRouteStops.map((item, index) => <div key={item.id} className="flex gap-3 rounded-lg border p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</div><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.address}</p></div></div>)}</CardContent></Card>}

        {orderedAssignments.length > 0 && <div className="grid gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden"><CardHeader><CardTitle className="text-sm">Ruttkarta</CardTitle></CardHeader><CardContent className="p-0"><div className="h-[420px]"><Suspense fallback={<div className="flex h-full items-center justify-center">Laddar karta…</div>}><RouteMapLeaflet assignments={orderedAssignments} /></Suspense></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Körordning ({orderedAssignments.length} stopp)</CardTitle></CardHeader><CardContent className="space-y-2">{orderedAssignments.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.title}</p><p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {item.address}</p><p className="text-xs text-muted-foreground">{format(new Date(item.scheduled_start), 'HH:mm')}{item.geofence_lat == null && <Badge variant="outline" className="ml-2 text-[10px]">saknar koordinat</Badge>}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setOrderedIds(moveStop(orderedIds, index, -1))} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setOrderedIds(moveStop(orderedIds, index, 1))} disabled={index === orderedAssignments.length - 1}><ArrowDown className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>
        </div>}
      </div>
    </AdminLayout>
  );
}
