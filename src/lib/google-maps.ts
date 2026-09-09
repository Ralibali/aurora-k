import { useCallback, useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';

// Google Maps-nyckeln kan komma från byggkonfigurationen (VITE_GOOGLE_MAPS_API_KEY)
// eller, när den saknas, från edge-funktionen maps-config som endast lämnar ut
// den publika webbnyckeln till inloggade företagsadministratörer. Saknas båda
// faller kartorna tillbaka på Leaflet/OpenStreetMap och manuella adressfält.
const BUILD_TIME_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const RETRY_AFTER_FAILURE_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;

let activeKey: string | null = BUILD_TIME_KEY || null;
let inflight: Promise<string | null> | null = null;
let lastFailureAt = 0;
let generation = 0;
let loaderPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());

export const hasBuildTimeGoogleMapsKey = Boolean(BUILD_TIME_KEY);
export const googleMapsAvailable = () => Boolean(activeKey);

// Nollställs vid utloggning eller användarbyte så att en nyckel aldrig lever
// kvar mellan konton och så att ett tidigare misslyckat försök kan göras om.
export function resetGoogleMapsConfig() {
  generation += 1;
  inflight = null;
  lastFailureAt = 0;
  loaderPromise = null;
  activeKey = BUILD_TIME_KEY || null;
  publish();
}

export function ensureGoogleMapsKey(): Promise<string | null> {
  if (activeKey) return Promise.resolve(activeKey);
  if (inflight) return inflight;
  if (lastFailureAt && Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return Promise.resolve(null);

  const requested = generation;
  const request = (async () => {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT_MS));
    const invoke = supabase.functions.invoke<{ configured: boolean; key?: string }>('maps-config', { body: {} });
    const { data, error } = await Promise.race([invoke, timeout]);
    if (error) throw error;
    return typeof data?.key === 'string' && data.key ? data.key : null;
  })();

  inflight = request
    .then(key => {
      if (requested !== generation) return null;
      activeKey = key;
      lastFailureAt = key ? 0 : Date.now();
      publish();
      return key;
    })
    .catch(() => {
      if (requested === generation) { lastFailureAt = Date.now(); publish(); }
      return null;
    })
    .finally(() => { if (requested === generation) inflight = null; });

  return inflight;
}

// Reaktiv tillgänglighet: startar som false, blir true först när en giltig
// nyckel finns. Alla vyer behåller sina fallback-lägen under tiden.
export function useGoogleMapsAvailable() {
  const [available, setAvailable] = useState(googleMapsAvailable);
  const sync = useCallback(() => setAvailable(googleMapsAvailable()), []);

  useEffect(() => {
    listeners.add(sync);
    sync();
    if (!googleMapsAvailable()) void ensureGoogleMapsKey();
    return () => { listeners.delete(sync); };
  }, [sync]);

  return available;
}

// Laddar Maps JavaScript API en gång (delat löfte) och gör den globala
// google.maps-namnrymden tillgänglig för kartkomponenterna.
export function loadGoogleMaps(): Promise<void> {
  loaderPromise ??= (async () => {
    const key = await ensureGoogleMapsKey();
    if (!key) throw new Error('Google Maps-nyckel saknas');
    setOptions({ key, v: 'weekly', language: 'sv', region: 'SE' });
    await Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('core')]);
  })().catch(error => { loaderPromise = null; throw error; });
  return loaderPromise;
}
