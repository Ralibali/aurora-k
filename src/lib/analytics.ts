// Central, type-safe analytics helper for Plausible.
//
// Rules:
//  - Never send PII (name, email, phone, order id, reg no, customer name, free text).
//  - Only allow the low-cardinality property set defined in `PropMap` below.
//  - Do not fire events (or automatic pageviews) on internal work views:
//    /admin, /driver, /platform, /portal, /onboarding, /track/*.
//  - Do not send manual pageviews — the Plausible script already handles SPA
//    history navigation. This helper is only for business events.
//
// The helper is a thin, side-effect-free wrapper over `window.plausible`, which
// is initialised once by the snippet in `index.html`.

export type Plan = 'aurora_449';
export type BillingInterval = 'monthly' | 'yearly';
export type EventSource =
  | 'landing'
  | 'pricing'
  | 'register'
  | 'demo_modal'
  | 'lead_form'
  | 'onboarding'
  | 'settings';
export type Role = 'admin' | 'driver' | 'platform_admin';

export type PropMap = {
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

const INTERNAL_PREFIXES = [
  '/admin',
  '/driver',
  '/platform',
  '/portal',
  '/onboarding',
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
    plausible?: PlausibleFn & { q?: unknown[]; o?: unknown; init?: (i?: unknown) => void };
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

export function trackEvent<E extends EventName>(name: E, props: PropMap[E] = {} as PropMap[E]): void {
  if (typeof window === 'undefined') return;
  if (isInternalPath()) return;
  const fn = window.plausible;
  if (typeof fn !== 'function') return;
  try {
    const cleaned = sanitizeProps(props as Record<string, unknown>);
    fn(name, Object.keys(cleaned).length ? { props: cleaned } : undefined);
  } catch {
    // Never break the UI for analytics
  }
}

/**
 * Fire an event at most once per browser, keyed by a stable dedupe key.
 * Use for events that could otherwise be triggered by re-renders / re-mounts
 * (e.g. Signup Completed keyed on companyId).
 *
 * The dedupe key is stored in localStorage only — it is never sent to Plausible.
 */
export function trackEventOnce<E extends EventName>(
  dedupeKey: string,
  name: E,
  props: PropMap[E] = {} as PropMap[E],
): void {
  const storeKey = `at_analytics_v1:${name}:${dedupeKey}`;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(storeKey)) return;
    if (typeof localStorage !== 'undefined') localStorage.setItem(storeKey, '1');
  } catch {
    // storage disabled — fall through and fire anyway
  }
  trackEvent(name, props);
}

/**
 * Install a wrapper around `window.plausible` so that automatic SPA pageviews
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
      if (isInternalPath()) return;
      if (typeof raw === 'function') return raw.apply(this, args);
    } as PlausibleFn;
    // Preserve queue / options set by the snippet
    if (raw) Object.assign(wrapped, raw);
    return wrapped;
  };

  let current: PlausibleFn | undefined = wrap(window.plausible);
  try {
    Object.defineProperty(window, 'plausible', {
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
    window.plausible = current;
  }
}
