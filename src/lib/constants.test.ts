import { describe, expect, it } from 'vitest';
import { PUBLIC_SITE_URL } from './constants';

describe('PUBLIC_SITE_URL', () => {
  it('defaults to the current production host without a trailing slash', () => {
    expect(PUBLIC_SITE_URL).toBe('https://auroratransport.se');
  });
});
