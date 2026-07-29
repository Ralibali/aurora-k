import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';

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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function RouteMapGoogle({ assignments }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: 59.33, lng: 18.07 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new google.maps.InfoWindow();
      })
      .catch((error) => {
        console.error('[RouteMapGoogle] Kunde inte ladda Google Maps:', error);
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    const path: google.maps.LatLngLiteral[] = [];

    assignments.forEach((a, i) => {
      if (!a.geofence_lat || !a.geofence_lng) return;

      const position = { lat: a.geofence_lat, lng: a.geofence_lng };
      path.push(position);
      bounds.extend(position);

      const color = COLORS[i % COLORS.length];
      const marker = new google.maps.Marker({
        position,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 14,
        },
        label: { text: String(i + 1), color: '#ffffff', fontWeight: '700', fontSize: '13px' },
      });

      const time = new Date(a.scheduled_start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      marker.addListener('click', () => {
        infoRef.current?.setContent(`
          <div style="min-width:160px;font-family:inherit">
            <strong>${i + 1}. ${a.title}</strong>
            <br/><span style="color:#666">📍 ${a.address}</span>
            <br/><span style="color:#999;font-size:12px">🕐 ${time}</span>
          </div>
        `);
        infoRef.current?.open({ map, anchor: marker });
      });

      overlaysRef.current.push(marker);
    });

    // Streckad rutlinje mellan stoppen (Google-stil: symboler längs linjen)
    if (path.length >= 2) {
      const line = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0,
        strokeWeight: 3,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, strokeWeight: 3, strokeColor: '#3b82f6', scale: 2 }, offset: '0', repeat: '14px' }],
      });
      line.setMap(map);
      overlaysRef.current.push(line);
    }

    if (path.length > 0) {
      map.fitBounds(bounds, 50);
    }
  }, [assignments]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Kunde inte ladda Google Maps — kontrollera API-nyckeln.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
