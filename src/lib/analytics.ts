import { isAnalyticsConsentGranted } from './ga4Runtime';
// Type-safe GA4 business events, transported only after statistics consent.
// ga4Runtime owns SPA pageviews and blocks internal route context.
// Never pass personal data, free text, tokens or customer identifiers.

export type Plan = 'aurora_449';
export type BillingInterval = 'monthly' | 'yearly';
export type EventSource =
  | 'landing'
  | 'pricing'
  | 'register'
  | 'demo_modal'
  | 'standalone_demo'
  | 'mobile_demo'
  | 'lead_form'
  | 'onboarding'
  | 'settings';
export type Role = 'admin' | 'driver' | 'platform_admin';

export type PropMap = {
  'Generate Lead': { lead_source: EventSource };
  'Signup Completed': { source?: EventSource; role?: Role };
  'Trial Started': { plan?: Plan; billing_interval?: BillingInterval };
  'Demo Requested': { source?: EventSource };
  'Subscription Checkout Started': {
    plan?: Plan;
    billing_interval?: BillingInterval;
    source?: EventSource;
  };
  'Subscription Purchased': { plan?: Plan; billing_interval?: BillingInterval };
};

export type EventName = keyof PropMap;

// Operational work views — do NOT track pageviews or generic events on these.
// `/onboarding` is intentionally NOT here: it is a conversion surface that
// fires Signup Completed / Trial Started after a successful checkout return.
const INTERNAL_PREFIXES = [
  '/admin',
  '/driver',
  '/platform',
  '/portal',
  '/track/',
];

export function isInternalPath(path: string = typeof window !== 'undefined' ? window.location.pathname : '/'): boolean {
  return INTERNAL_PREFIXES.some(
    (p) => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'),
  );
}

type PlausibleFn = (
  event: string,
  opts?: { props?: Record<string, string | number | boolean>; callback?: () => void },
) => void;

declare global {
  interface Window {
    analyticsEvent?: PlausibleFn & { q?: unknown[]; o?: unknown; init?: (i?: unknown) => void };
  }
}

type PropValue = string | number | boolean;

function sanitizeProps(input: Record<string, unknown>): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

export interface TrackOptions {
  /**
   * Bypass the internal-route guard. Reserved for conversion events that
   * legitimately fire from inside an authenticated area (e.g. Subscription
   * Purchased confirmed via subscription status inside /admin/settings).
   */
  allowInternal?: boolean;
}

export function trackEvent<E extends EventName>(
  name: E,
  props: PropMap[E] = {} as PropMap[E],
  options: TrackOptions = {},
): void {
  if (typeof window === 'undefined') return;
  if (!options.allowInternal && isInternalPath()) return;
  const fn = window.analyticsEvent;
  if (typeof fn !== 'function') return;
  try {
    const cleaned = sanitizeProps(props as Record<string, unknown>);
    fn(name, Object.keys(cleaned).length ? { props: cleaned } : undefined);
  } catch {
    // Never break the UI for analytics
  }
}

/** Call only after the lead has been saved successfully. */
export function trackLeadSubmitted(source: EventSource): void {
  trackEvent('Generate Lead', { lead_source: source });
  // Keep the existing detail event for historical reporting, not as a second key event.
  trackEvent('Demo Requested', { source });
}

// Deduplicate in memory only after consent. No customer IDs are persisted for statistics.
const sentOnce = new Set<string>();
export function trackEventOnce<E extends EventName>(
  dedupeKey: string, name: E, props: PropMap[E] = {} as PropMap[E], options: TrackOptions = {},
): void {
  if (!isAnalyticsConsentGranted()) return;
  const key = `${name}:${dedupeKey}`;
  if (sentOnce.has(key)) return;
  sentOnce.add(key);
  trackEvent(name, props, options);
}

/**
 * Install a wrapper around `window.analyticsEvent` so that automatic SPA pageviews
 * (and any events) fired while the user is on an internal work view are
 * suppressed. Uses a property descriptor so a later reassignment by the
 * Plausible script bundle is re-wrapped automatically.
 */
export function installPlausibleRouteGuard(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __plausibleGuardInstalled?: boolean };
  if (w.__plausibleGuardInstalled) return;
  w.__plausibleGuardInstalled = true;

  const wrap = (raw: PlausibleFn | undefined): PlausibleFn => {
    const wrapped = function (this: unknown, ...args: Parameters<PlausibleFn>) {
      // Only suppress automatic pageviews on internal work views. Custom
      // business events are gated inside `trackEvent` (which respects the
      // `allowInternal` option), so we let them through here.
      const eventName = args[0];
      if (eventName === 'pageview' && isInternalPath()) return;
      if (typeof raw === 'function') return raw.apply(this, args);
    } as PlausibleFn;
    // Preserve queue / options set by the snippet
    if (raw) Object.assign(wrapped, raw);
    return wrapped;
  };

  let current: PlausibleFn | undefined = wrap(window.analyticsEvent);
  try {
    Object.defineProperty(window, 'analyticsEvent', {
      configurable: true,
      get() {
        return current;
      },
      set(next: PlausibleFn | undefined) {
        current = wrap(next);
      },
    });
  } catch {
    // If defineProperty fails (some hardened envs), fall back to direct assign.
    window.analyticsEvent = current;
  }
}
