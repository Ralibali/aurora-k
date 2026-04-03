import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, MapPin, Clock, Navigation } from 'lucide-react';

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

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s sedan`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m sedan`;
  return `${Math.floor(minutes / 60)}h sedan`;
}

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

interface LeafletMapProps {
  locations: any[];
  navigate: (path: string) => void;
}

export default function LeafletMap({ locations, navigate }: LeafletMapProps) {
  const defaultCenter: [number, number] = [59.33, 18.07];
  const positions: [number, number][] = locations.map((l: any) => [l.latitude, l.longitude]);

  return (
    <MapContainer
      center={positions.length > 0 ? positions[0] : defaultCenter}
      zoom={10}
      className="h-full w-full z-0"
      style={{ background: 'hsl(var(--muted))' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length > 0 && <FitBounds positions={positions} />}
      {locations.map((loc: any) => (
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
              {loc.assignment_id && (
                <button
                  onClick={() => navigate(`/admin/assignments/${loc.assignment_id}`)}
                  className="mt-1 w-full text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded px-2 py-1.5 transition-colors text-center"
                >
                  Visa uppdrag →
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
