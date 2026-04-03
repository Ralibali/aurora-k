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

interface Assignment {
  id: string;
  title: string;
  address: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  status: string;
  geofence_lat?: number | null;
  geofence_lng?: number | null;
}

interface RouteMapProps {
  assignments: Assignment[];
}

// Simple color palette for numbered markers
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function createNumberedIcon(num: number): L.DivIcon {
  const color = COLORS[(num - 1) % COLORS.length];
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:#fff;
      width:28px;height:28px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export default function RouteMapLeaflet({ assignments }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([59.33, 18.07], 10);
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

    // Clear existing layers (markers + polylines)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const positions: L.LatLngExpression[] = [];

    assignments.forEach((a, i) => {
      if (!a.geofence_lat || !a.geofence_lng) return;

      const pos: L.LatLngExpression = [a.geofence_lat, a.geofence_lng];
      positions.push(pos);

      const marker = L.marker(pos, { icon: createNumberedIcon(i + 1) }).addTo(map);

      const time = new Date(a.scheduled_start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      marker.bindPopup(`
        <div style="min-width:160px">
          <strong>${i + 1}. ${a.title}</strong>
          <br/><span style="color:#666">📍 ${a.address}</span>
          <br/><span style="color:#999;font-size:12px">🕐 ${time}</span>
        </div>
      `);
    });

    // Draw route line between stops
    if (positions.length >= 2) {
      L.polyline(positions, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 8',
      }).addTo(map);
    }

    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [assignments]);

  return <div ref={containerRef} className="h-full w-full" />;
}
