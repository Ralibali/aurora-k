import { describe, expect, it } from 'vitest';
import { loginDestination } from './login-destination';

describe('login destination', () => {
  const admin = { role: 'admin' as const, isPlatformAdmin: false };
  const driver = { role: 'driver' as const, isPlatformAdmin: false };
  it('preserves assignment links, filters and anchors for the correct role', () => {
    expect(loginDestination('/driver/assignments/job-12?tab=proof#photo', driver)).toBe('/driver/assignments/job-12?tab=proof#photo');
    expect(loginDestination('/admin/assignments?date=2026-09-08', admin)).toBe('/admin/assignments?date=2026-09-08');
  });
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/admin/../../login', '/administrator', '/login', '/platform', null, {}, '/admin\n/evil'])('rejects unsafe or unauthorized destination %s', from => {
    expect(loginDestination(from, admin)).toBe('/admin');
  });
  it('routes to the actual account area when a link belongs to another role', () => {
    expect(loginDestination('/admin/assignments', driver)).toBe('/driver');
    expect(loginDestination('/driver/assignments', admin)).toBe('/admin');
    expect(loginDestination('/platform/companies', { role: null, isPlatformAdmin: true })).toBe('/platform/companies');
  });
});
