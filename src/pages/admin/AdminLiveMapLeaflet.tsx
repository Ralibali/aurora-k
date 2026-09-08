import { useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: L.LatLngExpression = [59.33, 18.07];
    const map = L.map(containerRef.current).setView(defaultCenter, 10);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

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

  return <div ref={containerRef} className="h-full w-full" />;
}
