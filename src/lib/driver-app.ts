import { Capacitor } from '@capacitor/core';

// The build flag also lets us test the exact app surface in a browser.
export const isDriverApp = import.meta.env.VITE_DRIVER_APP === 'true' || Capacitor.isNativePlatform();

export function isDriverAppRoute(pathname: string) {
  return pathname === '/driver' || pathname.startsWith('/driver/')
    || ['/login', '/forgot-password', '/privacy'].includes(pathname);
}
