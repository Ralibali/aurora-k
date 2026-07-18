// Lightweight GA4 event tracking helper.
// Falls back to no-op when gtag is missing (dev/preview without GA loaded).

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export type TrackParams = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: TrackParams = {}): void {
  try {
    if (typeof window === 'undefined') return;
    const gtag = window.gtag;
    if (typeof gtag === 'function') {
      gtag('event', event, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...params });
    }
    if (import.meta.env.DEV) {
      console.debug('[track]', event, params);
    }
  } catch {
    // ignore tracking errors — never break the UI
  }
}

/** Hook: fires scroll_depth events at 25/50/75/100 % once per page load. */
import { useEffect } from 'react';

export function useScrollDepthTracking(page: string): void {
  useEffect(() => {
    const fired = new Set<number>();
    const thresholds = [25, 50, 75, 100];

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const viewport = window.innerHeight;
      const full = doc.scrollHeight - viewport;
      if (full <= 0) return;
      const pct = Math.min(100, Math.round((scrollTop / full) * 100));
      for (const t of thresholds) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          track('scroll_depth', { page, percent: t });
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [page]);
}