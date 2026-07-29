import { describe, expect, it } from 'vitest';
import { isTrialActive, trialDaysLeft } from './trial';

const NOW = new Date('2026-07-15T12:00:00');

function offset(hours: number) {
  return new Date(NOW.getTime() + hours * 3_600_000).toISOString();
}

describe('trialDaysLeft', () => {
  it('returnerar 0 utan slutdatum (= ingen aktiv provperiod)', () => {
    expect(trialDaysLeft(null, NOW)).toBe(0);
  });

  it('räknar hela dagar kvar', () => {
    expect(trialDaysLeft(offset(24 * 14), NOW)).toBe(14);
    expect(trialDaysLeft(offset(24), NOW)).toBe(1);
  });

  it('rundar uppåt innevarande dag', () => {
    expect(trialDaysLeft(offset(3), NOW)).toBe(1); // 3 timmar kvar = sista dagen
  });

  it('är negativ när provperioden passerat', () => {
    expect(trialDaysLeft(offset(-25), NOW)).toBe(-1);
    expect(trialDaysLeft(offset(-48), NOW)).toBe(-2);
  });
});

describe('isTrialActive', () => {
  it('är true bara medan tiden är kvar', () => {
    expect(isTrialActive(offset(24), NOW)).toBe(true);
    expect(isTrialActive(offset(1), NOW)).toBe(true);
    expect(isTrialActive(offset(-1), NOW)).toBe(false);
    expect(isTrialActive(null, NOW)).toBe(false);
  });
});
