import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';
import { isValidMapCoordinate, mapPopup, mapTimeAgo } from '@/lib/map-content';
import type { DriverLocation } from './AdminLiveMapLeaflet';

interface GoogleMapProps {
  locations: DriverLocation[];
  navigate: (path: string) => void;
}

export default function GoogleLiveMap({ locations }: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
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
        console.error('[GoogleLiveMap] Kunde inte ladda Google Maps:', error);
        window.clearTimeout(timeout);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      markersRef.current.forEach(overlay => { google.maps.event.clearInstanceListeners(overlay); overlay.setMap(null); });
      markersRef.current = [];
      infoRef.current?.close();
      infoRef.current = null;
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    markersRef.current.forEach(marker => { google.maps.event.clearInstanceListeners(marker); marker.setMap(null); });
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    locations.forEach((loc) => {
      if (!isValidMapCoordinate(loc.latitude, loc.longitude)) return;
      const position = { lat: loc.latitude, lng: loc.longitude };
      const marker = new google.maps.Marker({ position, map });

      const driverName = loc.driver?.full_name ?? 'Okänd förare';
      const content = mapPopup(driverName, [loc.assignment?.title, loc.assignment?.address, `Uppdaterad ${mapTimeAgo(loc.updated_at)}`].filter((value): value is string => Boolean(value)), loc.assignment_id);

      marker.addListener('click', () => {
        infoRef.current?.setContent(content);
        infoRef.current?.open({ map, anchor: marker });
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, 50);
    }
    return () => {
      infoRef.current?.close();
      markersRef.current.forEach(marker => { google.maps.event.clearInstanceListeners(marker); marker.setMap(null); });
      markersRef.current = [];
    };
  }, [locations, ready]);

  if (loadError) {
    return (
      <div role="alert" className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Kartan kunde inte laddas. Kontrollera anslutningen och ladda om sidan.
      </div>
    );
  }

  return <div className="relative h-full w-full"><div ref={containerRef} className="h-full w-full" />{!ready && <div role="status" className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">Laddar karta…</div>}</div>;
}
