import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';
import type { DriverLocation } from './AdminLiveMapLeaflet';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'okänt';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s sedan`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m sedan`;
  return `${Math.floor(minutes / 60)}h sedan`;
}

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
        console.error('[GoogleLiveMap] Kunde inte ladda Google Maps:', error);
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    locations.forEach((loc) => {
      const position = { lat: loc.latitude, lng: loc.longitude };
      const marker = new google.maps.Marker({ position, map });

      const driverName = loc.driver?.full_name ?? 'Okänd förare';
      let html = `<div style="min-width:180px;font-family:inherit"><strong>${driverName}</strong>`;
      if (loc.assignment) {
        html += `<br/><span style="color:#666">📍 ${loc.assignment.title}</span>`;
        html += `<br/><span style="color:#666">${loc.assignment.address ?? ''}</span>`;
      }
      html += `<br/><small style="color:#999">Uppdaterad ${timeAgo(loc.updated_at)}</small>`;
      if (loc.assignment_id) {
        html += `<br/><a href="/admin/assignments/${loc.assignment_id}" style="color:#3b82f6;font-size:12px">Visa uppdrag →</a>`;
      }
      html += '</div>';

      marker.addListener('click', () => {
        infoRef.current?.setContent(html);
        infoRef.current?.open({ map, anchor: marker });
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (locations.length > 0) {
      map.fitBounds(bounds, 50);
    }
  }, [locations]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Kunde inte ladda Google Maps — kontrollera API-nyckeln.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
