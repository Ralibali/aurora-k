/**
 * Public canonical site URL used for customer-facing links (tracking, portal).
 *
 * Override with VITE_PUBLIC_SITE_URL (no trailing slash). Default stays
 * https://auroratransport.se so current production is unchanged.
 *
 * IMPORTANT: Do not use `window.location.origin` for links that end up in
 * customer emails. In the native driver app (Capacitor) that resolves to
 * `capacitor://localhost`, which produces dead links in the recipient's inbox.
 */
const DEFAULT_PUBLIC_SITE_URL = 'https://auroratransport.se';

function resolvePublicSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  return DEFAULT_PUBLIC_SITE_URL;
}

export const PUBLIC_SITE_URL = resolvePublicSiteUrl();