/** Canonical product host. Default stays production; override via env. */
export const DEFAULT_SITE_URL = "https://auroratransport.se";

/** Known preview/legacy Lovable origin — keep allowed for Stripe returns. */
export const LEGACY_LOVABLE_ORIGIN = "https://aurora-k.lovable.app";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Production host for user-facing links (emails, Stripe fallback, join/track/portal).
 * Reads SITE_URL or PUBLIC_SITE_URL so a new host needs no code change.
 */
export function getSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || DEFAULT_SITE_URL;
  return stripTrailingSlash(raw.trim());
}

export function sitePath(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${suffix}`;
}

function isLocalDevOrigin(origin: string): boolean {
  return origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
}

/**
 * Resolve the browser origin for Stripe success/cancel/return URLs.
 * Allows SITE_URL (whatever it is), the current production host, the
 * Lovable preview origin, and localhost. Unknown origins fall back to SITE_URL.
 */
export function safeOrigin(req: Request): string {
  const fallback = getSiteUrl();
  const origin = req.headers.get("origin")?.replace(/\/$/, "");
  const allowed = new Set([fallback, DEFAULT_SITE_URL, LEGACY_LOVABLE_ORIGIN]);
  if (origin && (allowed.has(origin) || isLocalDevOrigin(origin))) {
    return origin;
  }
  return fallback;
}
