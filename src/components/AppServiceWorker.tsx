import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { isAppRoute } from '@/lib/app-service-worker';
let registered = false;
export function AppServiceWorker() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Public navigation must neither install a worker nor remove a driver's
    // existing offline cache. Also handles SPA navigation from login to /driver.
    if (registered || !isAppRoute(pathname) || !import.meta.env.PROD || Capacitor.isNativePlatform()) return;
    const { hostname, protocol } = window.location;
    if (protocol !== 'https:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(hostname) || hostname.includes('id-preview--') || hostname.includes('lovableproject.com')) return;
    try { if (window.self !== window.top) return; } catch { return; }
    registered = true;
    void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => { registered = false; });
  }, [pathname]);
  return null;
}
