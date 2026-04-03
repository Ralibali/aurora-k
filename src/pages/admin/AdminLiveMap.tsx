import { useEffect, useState, Component, ReactNode, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

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

export default function AdminLiveMap() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
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
    setLoading(false);
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
        <Badge variant="outline" className="gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          {locations.length} aktiv{locations.length !== 1 ? 'a' : ''}
        </Badge>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[calc(100vh-220px)] min-h-[400px] relative">
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
                    <LeafletMap locations={locations} navigate={navigate} />
                  </Suspense>
                </MapErrorBoundary>
              )}

              {!loading && locations.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-[1000] pointer-events-none">
                  <MapPin className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">Inga aktiva förare just nu</p>
                  <p className="text-sm">Positioner visas när chaufförer har startade uppdrag</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
