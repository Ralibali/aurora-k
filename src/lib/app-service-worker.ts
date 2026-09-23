export function isAppRoute(pathname: string): boolean {
  return /^\/(admin|driver|platform|onboarding)(\/|$)/.test(pathname);
}
