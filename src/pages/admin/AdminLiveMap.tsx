import { useEffect, useState, Component, ReactNode, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, AlertTriangle, Plus, Truck } from 'lucide-react';
import { hasGoogleMapsKey } from '@/lib/google-maps';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoDriverLocations } from '@/lib/demo-data';
import { Link } from 'react-router-dom';

interface DriverLocation {
  id: string;
  driver_id: string;
  assignment_id: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
  driver?: { full_name: string; email: string };
  assignment?: { title: string; address: string };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s sedan`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m sedan`;
  return `${Math.floor(minutes / 60)}h sedan`;
}

// Error boundary to catch map rendering issues
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
          <AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
          <p className="font-medium">Kartan kunde inte laddas</p>
          <p className="text-sm">Prova att ladda om sidan</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Ladda om</Button>
        </div>
      );
    }
    return this.state.hasError ? null : this.props.children;
  }
}

// Lazy load the map component to isolate potential issues
const LeafletMap = lazy(() => import('./AdminLiveMapLeaflet'));
const GoogleMap = lazy(() => import('./AdminLiveMapGoogle'));

export default function AdminLiveMap() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { enabled: demoEnabled } = useDemoMode();

  const effectiveLocations: DriverLocation[] = (demoEnabled && locations.length === 0)
    ? (demoDriverLocations as unknown as DriverLocation[])
    : locations;

  const fetchLocations = async () => {
    try {
      const { data } = await supabase
        .from('driver_locations')
        .select('*');

      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map((d) => d.driver_id))];
        const assignmentIds = [...new Set(data.map((d) => d.assignment_id).filter(Boolean))] as string[];

        const [profilesRes, assignmentsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email').in('id', driverIds),
          assignmentIds.length > 0
            ? supabase.from('assignments').select('id, title, address').in('id', assignmentIds)
            : Promise.resolve({ data: [] }),
        ]);

        const profilesMap = Object.fromEntries(
          (profilesRes.data ?? []).map((p) => [p.id, p])
        );
        const assignmentsMap = Object.fromEntries(
          (assignmentsRes.data ?? []).map((a) => [a.id, a])
        );

        const enriched = data.map((loc) => ({
          ...loc,
          driver: profilesMap[loc.driver_id],
          assignment: loc.assignment_id ? assignmentsMap[loc.assignment_id] : undefined,
        }));

        setLocations(enriched);
      } else {
        setLocations([]);
      }
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();

    const channel = supabase
      .channel('driver-locations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        () => { fetchLocations(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <AdminLayout title="Live-karta" description="Realtidsposition för chaufförer med aktiva uppdrag">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            {effectiveLocations.length} aktiv{effectiveLocations.length !== 1 ? 'a' : ''}
          </Badge>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/assignments/new"><Plus className="h-3.5 w-3.5 mr-1" /> Skapa uppdrag</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Map */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[calc(100vh-260px)] min-h-[420px] relative">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <MapErrorBoundary>
                    <Suspense fallback={
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    }>
                      {hasGoogleMapsKey ? (
                        <GoogleMap locations={effectiveLocations} navigate={navigate} />
                      ) : (
                        <LeafletMap locations={effectiveLocations} navigate={navigate} />
                      )}
                    </Suspense>
                  </MapErrorBoundary>
                )}

                {!loading && effectiveLocations.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-[1000] pointer-events-none">
                    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl px-6 py-6 shadow-lg pointer-events-auto max-w-sm">
                      <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 mb-3">
                        <MapPin className="h-6 w-6 text-primary/70" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Följ aktiva chaufförer i realtid</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        När ett uppdrag är igång visas chaufförens position här, så du slipper ringa och fråga var de är.
                      </p>
                      <Button size="sm" asChild>
                        <Link to="/admin/assignments/new"><Plus className="h-4 w-4 mr-1" /> Skapa uppdrag</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side panel — active drivers */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aktiva chaufförer</p>
            </div>
            <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
              {effectiveLocations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Inga aktiva chaufförer just nu</p>
                </div>
              ) : (
                effectiveLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => loc.assignment_id && navigate(`/admin/assignments/${loc.assignment_id}`)}
                    className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {loc.driver?.full_name ?? 'Okänd förare'}
                        </p>
                        {loc.assignment && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {loc.assignment.title}
                          </p>
                        )}
                      </div>
                      {loc.speed != null && loc.speed > 0 && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          <Navigation className="h-2.5 w-2.5 mr-0.5" />
                          {Math.round(loc.speed)} km/h
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo(loc.updated_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
