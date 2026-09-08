import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';
import { isValidMapCoordinate, mapPopup, mapTimeAgo } from '@/lib/map-content';

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
  const [ready, setReady] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => { if (!cancelled) { cancelled = true; setLoadError(true); } }, 15_000);
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
        window.clearTimeout(timeout);
        setReady(current => current + 1);
      })
      .catch((error) => {
        console.error('[RouteMapGoogle] Kunde inte ladda Google Maps:', error);
        window.clearTimeout(timeout);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      overlaysRef.current.forEach(overlay => { google.maps.event.clearInstanceListeners(overlay); overlay.setMap(null); });
      overlaysRef.current = [];
      infoRef.current?.close();
      infoRef.current = null;
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    overlaysRef.current.forEach(overlay => { google.maps.event.clearInstanceListeners(overlay); overlay.setMap(null); });
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    const path: google.maps.LatLngLiteral[] = [];

    assignments.forEach((a, i) => {
      if (!isValidMapCoordinate(a.geofence_lat, a.geofence_lng)) return;

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
        infoRef.current?.setContent(mapPopup(`${i + 1}. ${a.title}`, [a.address, time]));
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
    return () => {
      infoRef.current?.close();
      overlaysRef.current.forEach(overlay => { google.maps.event.clearInstanceListeners(overlay); overlay.setMap(null); });
      overlaysRef.current = [];
    };
  }, [assignments, ready]);

  if (loadError) {
    return (
      <div role="alert" className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Kartan kunde inte laddas. Kontrollera anslutningen och ladda om sidan.
      </div>
    );
  }

  return <div className="relative h-full w-full"><div ref={containerRef} className="h-full w-full" />{!ready && <div role="status" className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">Laddar karta…</div>}</div>;
}
