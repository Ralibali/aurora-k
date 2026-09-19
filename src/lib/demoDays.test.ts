import { describe, expect, it } from 'vitest';
import { upcomingDemoDays } from './demoDays';

describe('demo booking calendar dates', () => {
  it('keeps Monday after local midnight as Monday, not UTC Sunday', () => {
    const [today] = upcomingDemoDays(new Date(2026, 8, 7, 0, 30));
    expect(today).toEqual({ value: '2026-09-07', offset: 0, weekday: 1, day: 7, month: 9 });
  });

  it('skips weekends across the daylight-saving transition', () => {
    const days = upcomingDemoDays(new Date(2026, 9, 23, 23, 30));
    expect(days).toHaveLength(7);
    expect(days.slice(0, 2).map(day => day.value)).toEqual(['2026-10-23', '2026-10-26']);
    expect(days.every(day => day.weekday > 0 && day.weekday < 6)).toBe(true);
  });

  it('keeps local dates consistent when crossing a year boundary', () => {
    expect(upcomingDemoDays(new Date(2026, 11, 31, 0, 30)).slice(0, 2).map(day => day.value))
      .toEqual(['2026-12-31', '2027-01-01']);
  });
});
