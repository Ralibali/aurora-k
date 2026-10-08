import { useCallback, useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { MAP_ERROR_MESSAGES, isMapErrorCode, type MapErrorCode } from '../../supabase/functions/_shared/mapsDiagnostics';

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
let failure: MapErrorCode | null = null;
let removeDiagnostics: (() => void) | null = null;
const reported = new Set<MapErrorCode>();

const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());

export const hasBuildTimeGoogleMapsKey = Boolean(BUILD_TIME_KEY);
export const googleMapsAvailable = () => Boolean(activeKey) && !failure;

export function reportGoogleMapsFailure(code: MapErrorCode) {
  // Keep a specific provider error if its generic callback fires afterwards.
  if (code === 'MapsAuthenticationError' && failure && failure !== 'MapsLoadError') return;
  failure = code;
  publish();
  if (reported.has(code)) return;
  reported.add(code);
  void supabase.functions.invoke('maps-config', { body: { action: 'report-error', code } }).catch(() => {});
}

export function useGoogleMapsFailure() {
  const [code, setCode] = useState(failure);
  useEffect(() => {
    const sync = () => setCode(failure);
    listeners.add(sync);
    sync();
    return () => { listeners.delete(sync); };
  }, []);
  return code ? MAP_ERROR_MESSAGES[code] : null;
}

function installDiagnostics() {
  if (removeDiagnostics || typeof window === 'undefined') return;
  const target = window as Window & { gm_authFailure?: () => void };
  const previousCallback = target.gm_authFailure;
  const previousError = console.error;
  const callback = () => { reportGoogleMapsFailure('MapsAuthenticationError'); previousCallback?.(); };
  const error: typeof console.error = (...args) => {
    // Google emits its precise code to the console, not to gm_authFailure.
    const match = args.find(value => typeof value === 'string' && value.includes('Google Maps JavaScript API error:'));
    const code = typeof match === 'string' ? /Google Maps JavaScript API error:\s*([A-Za-z]+)/.exec(match)?.[1] : undefined;
    if (isMapErrorCode(code)) reportGoogleMapsFailure(code);
    previousError.apply(console, args);
  };
  target.gm_authFailure = callback;
  console.error = error;
  removeDiagnostics = () => {
    if (target.gm_authFailure === callback) target.gm_authFailure = previousCallback;
    if (console.error === error) console.error = previousError;
    removeDiagnostics = null;
  };
}

// Nollställs vid utloggning eller användarbyte så att en nyckel aldrig lever
// kvar mellan konton och så att ett tidigare misslyckat försök kan göras om.
export function resetGoogleMapsConfig() {
  removeDiagnostics?.();
  failure = null;
  reported.clear();
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT_MS); });
    const invoke = supabase.functions.invoke<{ configured: boolean; key?: string }>('maps-config', { body: {} });
    const { data, error } = await Promise.race([invoke, timeout]).finally(() => clearTimeout(timer));
    if (error) throw error;
    return typeof data?.key === 'string' && data.key ? data.key : null;
  })();

  inflight = request
    .then(key => {
      if (requested !== generation) return null;
      activeKey = key;
      if (!key) failure = 'MissingKeyMapError';
      else if (failure === 'MissingKeyMapError' || failure === 'MapsLoadError') failure = null;
      lastFailureAt = key ? 0 : Date.now();
      publish();
      return key;
    })
    .catch(() => {
      if (requested === generation) { failure = 'MapsLoadError'; lastFailureAt = Date.now(); publish(); }
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
  if (failure) return Promise.reject(new Error(MAP_ERROR_MESSAGES[failure]));
  loaderPromise ??= (async () => {
    const key = await ensureGoogleMapsKey();
    if (!key) { reportGoogleMapsFailure('MissingKeyMapError'); throw new Error(MAP_ERROR_MESSAGES.MissingKeyMapError); }
    installDiagnostics();
    setOptions({ key, v: 'weekly', language: 'sv', region: 'SE' });
    await Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('core')]);
  })().catch(error => { loaderPromise = null; if (!failure) reportGoogleMapsFailure('MapsLoadError'); throw error; });
  return loaderPromise;
}
