import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Clock, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons in bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

// Auto-fit map to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

export default function AdminLiveMap() {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('driver_locations')
      .select('*');

    if (data && data.length > 0) {
      // Fetch driver and assignment info
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

    // Subscribe to realtime changes
    const channel = supabase
      .channel('driver-locations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        () => {
          fetchLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Default center: Sweden (Stockholm)
  const defaultCenter: [number, number] = [59.33, 18.07];
  const positions: [number, number][] = locations.map((l) => [l.latitude, l.longitude]);

  return (
    <AdminLayout title="Live-karta" description="Realtidsposition för chaufförer med aktiva uppdrag">
      <div className="space-y-4">
        <Badge variant="outline" className="gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          {locations.length} aktiv{locations.length !== 1 ? 'a' : ''}
        </Badge>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[calc(100vh-220px)] min-h-[400px]">
              {loading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <MapContainer
                  center={positions.length > 0 ? positions[0] : defaultCenter}
                  zoom={10}
                  className="h-full w-full z-0"
                  style={{ background: 'hsl(var(--muted))' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {positions.length > 0 && <FitBounds positions={positions} />}
                  {locations.map((loc) => (
                    <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                      <Popup>
                        <div className="min-w-[180px] space-y-2 text-sm">
                          <div className="flex items-center gap-2 font-semibold">
                            <User className="h-4 w-4 text-primary" />
                            {loc.driver?.full_name ?? 'Okänd förare'}
                          </div>
                          {loc.assignment && (
                            <>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Navigation className="h-3.5 w-3.5" />
                                {loc.assignment.title}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                {loc.assignment.address}
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Uppdaterad {timeAgo(loc.updated_at)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
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
