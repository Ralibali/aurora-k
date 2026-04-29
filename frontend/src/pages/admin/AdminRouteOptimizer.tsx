import { useState, useMemo, lazy, Suspense } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { MapPin, Route, Users, CalendarDays, Move, Save, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoDrivers, demoRouteStops } from '@/lib/demo-data';

const RouteMapLeaflet = lazy(() => import('./AdminRouteMapLeaflet'));

export default function AdminRouteOptimizer() {
  const { data: assignments } = useAssignments();
  const { data: drivers } = useDrivers();
  const { enabled: demoEnabled } = useDemoMode();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const effectiveDrivers = (demoEnabled && (!drivers || drivers.length === 0)) ? (demoDrivers as any[]) : (drivers ?? []);

  const driverAssignments = useMemo(() => {
    if (!selectedDriver || !assignments) return [];
    return assignments
      .filter(a => a.assigned_driver_id === selectedDriver && a.scheduled_start.startsWith(selectedDate) && a.status !== 'completed')
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  }, [assignments, selectedDriver, selectedDate]);

  // Demo route stops if demo enabled and a demo driver is selected (or if nothing chosen)
  const showDemoExample = demoEnabled && driverAssignments.length === 0;
  const exampleStops = showDemoExample ? demoRouteStops : [];

  return (
    <AdminLayout title="Slingor & Ruttoptimering">
      <div className="space-y-5">
        {/* Hero / sales-y intro */}
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="p-6 md:p-7">
            <div className="flex items-start gap-3 mb-2">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Optimera körordning och minska onödig körning</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Planera dagens stopp i rätt ordning, sänk milkostnaden och leverera i tid. Du ser hela rutten på kartan och justerar med drag-och-släpp.
                </p>
              </div>
            </div>

            {/* 4-step guide */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              {[
                { step: 1, icon: Users, title: 'Välj chaufför', text: 'Välj vem rutten gäller.' },
                { step: 2, icon: CalendarDays, title: 'Välj datum', text: 'Visa dagens stopp.' },
                { step: 3, icon: Move, title: 'Dra och släpp', text: 'Justera ordningen.' },
                { step: 4, icon: Save, title: 'Spara körordning', text: 'Föraren får uppdateringen direkt.' },
              ].map(s => (
                <div key={s.step} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">{s.step}</span>
                    <s.icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{s.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{s.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 items-end flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium">Chaufför</label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Välj chaufför" /></SelectTrigger>
              <SelectContent>{effectiveDrivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Datum</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Route Map */}
        {driverAssignments.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader><CardTitle className="text-sm">Ruttkarta</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="h-[350px]">
                <Suspense fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                }>
                  <RouteMapLeaflet assignments={driverAssignments} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedDriver && driverAssignments.length === 0 && !showDemoExample && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Route className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Inga uppdrag för vald dag</p>
              <p className="text-sm mt-1">Tilldela chauffören uppdrag för att kunna optimera rutten.</p>
            </CardContent>
          </Card>
        )}

        {/* Demo example route */}
        {showDemoExample && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                Exempel på optimerad rutt
                <Badge variant="secondary" className="text-[10px]">Demo</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">5 stopp · 45 km · ~5h</p>
            </CardHeader>
            <CardContent className="space-y-0">
              {exampleStops.map((a, i) => (
                <div key={a.id} className="flex items-start gap-3 py-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</div>
                    {i < exampleStops.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{a.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {a.address}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(a.scheduled_start), 'HH:mm')} – {format(new Date(a.scheduled_end), 'HH:mm')}
                      {a.distance_km > 0 && <span className="ml-2">· {a.distance_km} km</span>}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {driverAssignments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Körordning ({driverAssignments.length} stopp)</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              {driverAssignments.map((a, i) => (
                <div key={a.id}>
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      {i < driverAssignments.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{a.title}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {a.address}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(a.scheduled_start), 'HH:mm')}
                        {a.scheduled_end && ` – ${format(new Date(a.scheduled_end), 'HH:mm')}`}
                      </p>
                    </div>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
