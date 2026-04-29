import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

interface LeafletMapProps {
  locations: any[];
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
      const pos: L.LatLngExpression = [loc.latitude, loc.longitude];
      positions.push(pos);

      const marker = L.marker(pos).addTo(map);

      const driverName = loc.driver?.full_name ?? 'Okänd förare';
      let popupHtml = `<div style="min-width:180px"><strong>${driverName}</strong>`;
      if (loc.assignment) {
        popupHtml += `<br/><span style="color:#666">📍 ${loc.assignment.title}</span>`;
        popupHtml += `<br/><span style="color:#666">${loc.assignment.address}</span>`;
      }
      popupHtml += `<br/><small style="color:#999">Uppdaterad ${timeAgo(loc.updated_at)}</small>`;
      if (loc.assignment_id) {
        popupHtml += `<br/><a href="/admin/assignments/${loc.assignment_id}" style="color:#3b82f6;font-size:12px">Visa uppdrag →</a>`;
      }
      popupHtml += '</div>';

      marker.bindPopup(popupHtml);
    });

    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions as L.LatLngExpression[]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [locations, navigate]);

  return <div ref={containerRef} className="h-full w-full" />;
}
