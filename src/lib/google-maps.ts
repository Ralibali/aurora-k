import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Google Maps laddas enbart om en nyckel är konfigurerad — annars faller
// kartkomponenterna tillbaka på Leaflet/OpenStreetMap.
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY);

let loaderPromise: Promise<void> | null = null;

// Laddar Maps JavaScript API en gång (delat löfte) och gör det globala
// google.maps-namnrymden tillgänglig för kartkomponenterna.
export function loadGoogleMaps(): Promise<void> {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY saknas'));
  }
  loaderPromise ??= (async () => {
    setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'sv', region: 'SE' });
    await Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('core')]);
  })();
  return loaderPromise;
}
