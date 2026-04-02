import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const INTERVAL_MS = 15_000; // Update every 15 seconds

/**
 * Tracks the driver's GPS position and upserts it into driver_locations
 * while they have an active assignment (status === 'active').
 */
export function useDriverLocationTracker(
  driverId: string | undefined,
  activeAssignmentId: string | undefined
) {
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!driverId || !activeAssignmentId) {
      // No active assignment — clean up tracking and remove location row
      cleanup(driverId);
      return;
    }

    if (!('geolocation' in navigator)) {
      console.warn('[GPS] Geolocation not supported');
      return;
    }

    // Watch position continuously
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPos.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      (err) => console.warn('[GPS] Watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Send position to DB at regular intervals
    const sendPosition = async () => {
      if (!lastPos.current) return;
      const { lat, lng } = lastPos.current;

      const { error } = await supabase
        .from('driver_locations')
        .upsert(
          {
            driver_id: driverId,
            assignment_id: activeAssignmentId,
            latitude: lat,
            longitude: lng,
          },
          { onConflict: 'driver_id' }
        );

      if (error) {
        console.warn('[GPS] Upsert error:', error.message);
      }
    };

    // Send immediately, then on interval
    sendPosition();
    intervalId.current = setInterval(sendPosition, INTERVAL_MS);

    return () => {
      cleanup(driverId);
    };
  }, [driverId, activeAssignmentId]);

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
    // Remove location row when not tracking
    if (dId) {
      supabase
        .from('driver_locations')
        .delete()
        .eq('driver_id', dId)
        .then(() => {});
    }
  }
}
