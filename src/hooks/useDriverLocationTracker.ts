import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INTERVAL_MS = 15_000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface GeofenceConfig {
  lat: number;
  lng: number;
  radius: number;
}

export function useDriverLocationTracker(
  driverId: string | undefined,
  activeAssignmentId: string | undefined,
  companyId: string | null | undefined,
  geofence?: GeofenceConfig | null,
  onGeofenceEnter?: () => void,
  onGeofenceExit?: () => void,
) {
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const insideGeofence = useRef(false);

  const checkGeofence = useCallback((lat: number, lng: number) => {
    if (!geofence) return;
    const dist = haversineDistance(lat, lng, geofence.lat, geofence.lng);
    const isInside = dist <= geofence.radius;
    if (isInside && !insideGeofence.current) {
      insideGeofence.current = true;
      onGeofenceEnter?.();
      toast.info('Du har anlänt till uppdragsplatsen');
    } else if (!isInside && insideGeofence.current) {
      insideGeofence.current = false;
      onGeofenceExit?.();
      toast.info('Du har lämnat uppdragsplatsen');
    }
  }, [geofence, onGeofenceEnter, onGeofenceExit]);

  useEffect(() => {
    if (!driverId || !activeAssignmentId) {
      cleanup(driverId);
      return;
    }

    if (!('geolocation' in navigator)) {
      console.warn('[GPS] Geolocation not supported');
      return;
    }

    insideGeofence.current = false;

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPos.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        checkGeofence(position.coords.latitude, position.coords.longitude);
      },
      (err) => console.warn('[GPS] Watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    const sendPosition = async () => {
      if (!lastPos.current) return;
      const { lat, lng } = lastPos.current;
      const { error } = await supabase
        .from('driver_locations')
        .upsert(
          { driver_id: driverId, assignment_id: activeAssignmentId, latitude: lat, longitude: lng },
          { onConflict: 'driver_id' }
        );
      if (error) console.warn('[GPS] Upsert error:', error.message);
    };

    sendPosition();
    intervalId.current = setInterval(sendPosition, INTERVAL_MS);

    return () => { cleanup(driverId); };
  }, [driverId, activeAssignmentId, checkGeofence]);

  function cleanup(dId?: string) {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    lastPos.current = null;
    if (dId) {
      supabase.from('driver_locations').delete().eq('driver_id', dId).then(() => {});
    }
  }
}
