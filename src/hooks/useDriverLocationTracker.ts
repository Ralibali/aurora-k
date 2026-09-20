import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type CallbackID } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INTERVAL_MS = 15_000;
const HISTORY_INTERVAL_MS = 60_000;

interface GeofenceConfig {
  lat: number;
  lng: number;
  radius: number;
}

type Tracker = {
  subscribers: number;
  watchId: number | null;
  nativeWatchId: CallbackID | null;
  intervalId: ReturnType<typeof setInterval>;
  lastPosition: GeolocationPosition | null;
  insideGeofence: boolean;
  driverId: string;
  assignmentId: string;
  companyId: string;
  vehicleId?: string | null;
  lastHistoryAt: number;
  geofence?: GeofenceConfig | null;
  onEnter?: () => void;
  onExit?: () => void;
};

const trackers = new Map<string, Tracker>();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371e3;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function logGeofence(tracker: Tracker, action: 'geofence_enter' | 'geofence_exit') {
  const occurredAt = new Date().toISOString();
  const { error } = await supabase.from('assignment_logs').insert({
    assignment_id: tracker.assignmentId,
    user_id: tracker.driverId,
    company_id: tracker.companyId,
    action,
    new_value: occurredAt,
  });
  if (error) console.warn('[GPS] Geofence log error:', error.message);
  const position = tracker.lastPosition?.coords;
  const eventType = action === 'geofence_enter' ? 'enter' : 'exit';
  const [{ error: eventError }, { error: assignmentError }] = await Promise.all([
    supabase.from('fleet_geofence_events' as never).insert({
      company_id: tracker.companyId,
      driver_id: tracker.driverId,
      assignment_id: tracker.assignmentId,
      event_type: eventType,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      source: 'phone',
      occurred_at: occurredAt,
    } as never),
    supabase.from('assignments').update({
      [eventType === 'enter' ? 'geofence_entered_at' : 'geofence_exited_at']: occurredAt,
    } as never).eq('id', tracker.assignmentId),
  ]);
  if (eventError) console.warn('[GPS] Fleet geofence event error:', eventError.message);
  if (assignmentError) console.warn('[GPS] Assignment geofence update error:', assignmentError.message);
}

async function sendPosition(tracker: Tracker) {
  if (!tracker.lastPosition) return;
  const coordinates = tracker.lastPosition.coords;
  const { error } = await supabase.from('driver_locations').upsert({
    driver_id: tracker.driverId,
    assignment_id: tracker.assignmentId,
    company_id: tracker.companyId,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    heading: Number.isFinite(coordinates.heading) ? coordinates.heading : null,
    speed: coordinates.speed != null && Number.isFinite(coordinates.speed) ? coordinates.speed * 3.6 : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'driver_id' });
  if (error) console.warn('[GPS] Upsert error:', error.message);

  const now = Date.now();
  if (now - tracker.lastHistoryAt >= HISTORY_INTERVAL_MS) {
    const { error: historyError } = await supabase.from('fleet_location_history' as never).insert({
      driver_id: tracker.driverId,
      assignment_id: tracker.assignmentId,
      company_id: tracker.companyId,
      vehicle_id: tracker.vehicleId ?? null,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      heading: Number.isFinite(coordinates.heading) ? coordinates.heading : null,
      speed: coordinates.speed != null && Number.isFinite(coordinates.speed) ? coordinates.speed * 3.6 : null,
      accuracy: Number.isFinite(coordinates.accuracy) ? coordinates.accuracy : null,
      source: 'phone',
      recorded_at: new Date(now).toISOString(),
    } as never);
    if (historyError) console.warn('[GPS] History insert error:', historyError.message);
    else tracker.lastHistoryAt = now;
  }
}

async function startTracker(
  driverId: string,
  assignmentId: string,
  companyId: string,
  vehicleId?: string | null,
  geofence?: GeofenceConfig | null,
  onEnter?: () => void,
  onExit?: () => void,
): Promise<string> {
  const key = `${driverId}:${assignmentId}`;
  const existing = trackers.get(key);
  if (existing) {
    existing.subscribers += 1;
    existing.vehicleId = vehicleId;
    existing.geofence = geofence;
    existing.onEnter = onEnter;
    existing.onExit = onExit;
    return key;
  }

  const tracker: Tracker = {
    subscribers: 1,
    watchId: null,
    nativeWatchId: null,
    intervalId: 0 as unknown as ReturnType<typeof setInterval>,
    lastPosition: null,
    insideGeofence: false,
    driverId,
    assignmentId,
    companyId,
    vehicleId,
    lastHistoryAt: 0,
    geofence,
    onEnter,
    onExit,
  };

  const handlePosition = (position: GeolocationPosition) => {
    tracker.lastPosition = position;
    const fence = tracker.geofence;
    if (fence) {
      const isInside = haversineDistance(position.coords.latitude, position.coords.longitude, fence.lat, fence.lng) <= fence.radius;
      if (isInside !== tracker.insideGeofence) {
        tracker.insideGeofence = isInside;
        if (isInside) tracker.onEnter?.(); else tracker.onExit?.();
        void logGeofence(tracker, isInside ? 'geofence_enter' : 'geofence_exit');
        toast.info(isInside ? 'Du har anlänt till uppdragsplatsen' : 'Du har lämnat uppdragsplatsen');
      }
    }
    void sendPosition(tracker);
  };

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        console.warn('[GPS] Native location permission denied');
      } else {
        tracker.nativeWatchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20_000 },
          (position, err) => {
            if (err) { console.warn('[GPS] Native watch error:', err.message); return; }
            if (!position) return;
            handlePosition({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude ?? null,
                altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
                heading: position.coords.heading ?? null,
                speed: position.coords.speed ?? null,
              } as GeolocationCoordinates,
              timestamp: position.timestamp,
            } as GeolocationPosition);
          },
        );
      }
    } catch (err) {
      console.warn('[GPS] Native geolocation setup failed:', err);
    }
  } else if ('geolocation' in navigator) {
    tracker.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      error => console.warn('[GPS] Watch error:', error.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }

  tracker.intervalId = setInterval(() => void sendPosition(tracker), INTERVAL_MS);
  trackers.set(key, tracker);
  return key;
}

function releaseTracker(key: string) {
  const tracker = trackers.get(key);
  if (!tracker) return;
  tracker.subscribers -= 1;
  if (tracker.subscribers > 0) return;
  if (tracker.nativeWatchId != null) {
    Geolocation.clearWatch({ id: tracker.nativeWatchId }).catch(err => console.warn('[GPS] clearWatch failed', err));
  }
  if (tracker.watchId != null) {
    navigator.geolocation.clearWatch(tracker.watchId);
  }
  clearInterval(tracker.intervalId);
  trackers.delete(key);
  void supabase.from('driver_locations').delete().eq('driver_id', tracker.driverId).eq('assignment_id', tracker.assignmentId);
}

export function useDriverLocationTracker(
  driverId: string | undefined,
  activeAssignmentId: string | undefined,
  companyId: string | null | undefined,
  vehicleId?: string | null,
  geofence?: GeofenceConfig | null,
  onGeofenceEnter?: () => void,
  onGeofenceExit?: () => void,
) {
  useEffect(() => {
    if (!driverId || !activeAssignmentId || !companyId) return;
    if (!Capacitor.isNativePlatform() && !('geolocation' in navigator)) return;
    let cancelled = false;
    let resolvedKey: string | null = null;
    startTracker(driverId, activeAssignmentId, companyId, vehicleId, geofence, onGeofenceEnter, onGeofenceExit)
      .then(key => {
        if (cancelled) releaseTracker(key);
        else resolvedKey = key;
      })
      .catch(err => console.warn('[GPS] startTracker failed', err));
    return () => {
      cancelled = true;
      if (resolvedKey) releaseTracker(resolvedKey);
    };
  }, [activeAssignmentId, companyId, driverId, geofence, onGeofenceEnter, onGeofenceExit, vehicleId]);
}
