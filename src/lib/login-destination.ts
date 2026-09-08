type AccountAccess = { role: 'admin' | 'driver' | null; isPlatformAdmin: boolean };

// Preserve app deep links only. Never redirect to another origin or an auth page.
export function loginDestination(from: unknown, access: AccountAccess): string {
  const fallback = access.isPlatformAdmin ? '/platform' : access.role === 'driver' ? '/driver' : '/admin';
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || /[\\\s]/.test(from)) return fallback;
  try {
    const url = new URL(from, 'https://aurora.invalid');
    if (url.origin !== 'https://aurora.invalid') return fallback;
    const area = url.pathname.split('/')[1];
    const allowed = (area === 'platform' && access.isPlatformAdmin)
      || (area === 'admin' && access.role === 'admin')
      || (area === 'driver' && access.role === 'driver');
    return allowed ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
