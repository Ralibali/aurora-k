import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { isValidMapCoordinate, mapPopup, mapTimeAgo } from '@/lib/map-content';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export type DriverLocation = {
  latitude: number;
  longitude: number;
  updated_at?: string;
  assignment_id?: string | null;
  driver?: { full_name?: string | null } | null;
  assignment?: { title?: string; address?: string } | null;
};

interface LeafletMapProps {
  locations: DriverLocation[];
  navigate: (path: string) => void;
}

export default function LeafletMap({ locations, navigate }: LeafletMapProps) {
  const [tileError, setTileError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: L.LatLngExpression = [59.33, 18.07];
    const map = L.map(containerRef.current).setView(defaultCenter, 10);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).on('tileerror', () => setTileError(true)).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const positions: L.LatLngExpression[] = [];

    locations.forEach((loc) => {
      if (!isValidMapCoordinate(loc.latitude, loc.longitude)) return;
      const pos: L.LatLngExpression = [loc.latitude, loc.longitude];
      positions.push(pos);

      const marker = L.marker(pos).addTo(map);

      const driverName = loc.driver?.full_name ?? 'Okänd förare';
      marker.bindPopup(mapPopup(driverName, [loc.assignment?.title, loc.assignment?.address, `Uppdaterad ${mapTimeAgo(loc.updated_at)}`].filter((value): value is string => Boolean(value)), loc.assignment_id));
    });

    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions as L.LatLngExpression[]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [locations, navigate]);

  return <div className="relative h-full"><div ref={containerRef} className="h-full w-full" />{tileError && <div role="alert" className="absolute inset-x-4 bottom-4 z-[1100] rounded-2xl border bg-white p-4 text-sm shadow-lg"><p className="font-medium">Kartbilden kunde inte hämtas.</p><p className="mt-1 text-muted-foreground">Kontrollera din anslutning. Förarnas senaste positioner finns i listan.</p><button className="mt-2 px-3 text-sm font-medium underline" onClick={() => window.location.reload()}>Försök igen</button></div>}</div>;
}
