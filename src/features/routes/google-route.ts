import { loadGoogleMaps } from '@/lib/google-maps';
export type DrivingStop = { address: string; pickup_address?: string | null; delivery_address?: string | null };
export function drivingAddresses(stops: DrivingStop[]) {
  const addresses: string[] = [];
  for (const stop of stops) {
    const parts = stop.pickup_address || stop.delivery_address ? [stop.pickup_address, stop.delivery_address] : [stop.address];
    for (const part of parts) {
      const address = part?.trim();
      if (address && address !== addresses.at(-1)) addresses.push(address);
    }
  }
  return addresses;
}
export function googleDirectionsUrl(stop: DrivingStop) {
  const url = new URL('https://www.google.com/maps/dir/');
  const addresses = drivingAddresses([stop]);
  url.searchParams.set('api', '1'); url.searchParams.set('travelmode', 'driving');
  url.searchParams.set('destination', addresses.at(-1) ?? '');
  if (addresses.length > 1) url.searchParams.set('origin', addresses[0]);
  return url.href;
}
export async function computeDrivingRoute(stops: DrivingStop[]) {
  const addresses = drivingAddresses(stops);
  if (addresses.length < 2) throw new Error('Minst två olika adresser behövs för en körväg.');
  if (addresses.length > 27) throw new Error('Beräkna högst 27 adresser åt gången. Dela upp körningen i mindre slingor.');
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Google svarar inte just nu. Försök igen om en stund.')), 20000); });
  const calculate = async () => {
  await loadGoogleMaps();
  const { Route } = await google.maps.importLibrary('routes') as google.maps.RoutesLibrary;
  const { routes } = await Route.computeRoutes({ origin: addresses[0], destination: addresses.at(-1)!, intermediates: addresses.slice(1, -1).map(address => ({ location: address })), travelMode: 'DRIVING', routingPreference: 'TRAFFIC_UNAWARE', language: 'sv', region: 'SE', fields: ['path', 'distanceMeters', 'durationMillis'] });
  const route = routes[0];
  if (!route?.path?.length || route.distanceMeters == null || route.durationMillis == null) throw new Error('Google hittade ingen körväg för adresserna.');
  return { path: route.path.map(point => ({ lat: point.lat, lng: point.lng })), distanceKm: route.distanceMeters / 1000, minutes: Math.round(route.durationMillis / 60000) };
  };
  try { return await Promise.race([calculate(), timeout]); }
  finally { clearTimeout(timer!); }
}
