import { describe, expect, it } from 'vitest';
import { calculateObAmount, calculatePerDiem, computeSalary, workedHours } from '@/lib/salary-calculation';

const assignment = (start: string, stop: string) => ({ assigned_driver_id: 'driver-1', actual_start: start, actual_stop: stop });

describe('salary calculation', () => {
  it('calculates hours across midnight', () => {
    expect(workedHours([assignment('2026-01-05T22:00:00+01:00', '2026-01-06T06:00:00+01:00')])).toBe(8);
  });

  it('calculates overnight OB and does not double count overlapping rates', () => {
    const amount = calculateObAmount(
      [assignment('2026-01-05T22:00:00+01:00', '2026-01-06T06:00:00+01:00')],
      [
        { active: true, start_time: '18:00', end_time: '06:00', rate_per_hour: 50, applies_to_weekdays: true, applies_to_saturdays: false, applies_to_sundays: false },
        { active: true, start_time: '22:00', end_time: '05:00', rate_per_hour: 80, applies_to_weekdays: true, applies_to_saturdays: false, applies_to_sundays: false },
      ],
    );

    expect(amount).toBeCloseTo(610, 1);
  });

  it('splits per diem hours across calendar days', () => {
    const amount = calculatePerDiem(
      [assignment('2026-01-05T18:00:00+01:00', '2026-01-06T08:00:00+01:00')],
      [{ active: true, min_hours: 6, amount: 150 }],
    );

    expect(amount).toBe(300);
  });

  it('uses a weekly equivalent instead of full monthly salary in week view', () => {
    const drivers = [{ id: 'driver-1', full_name: 'Test Driver' }];
    const compensations = [{ driver_id: 'driver-1', compensation_type: 'monthly', monthly_salary: 39000 }];
    const week = computeSalary([], drivers, compensations, [], [], 'week');
    const month = computeSalary([], drivers, compensations, [], [], 'month');

    expect(week.rows[0].grossPay).toBeCloseTo(9000, 2);
    expect(month.rows[0].grossPay).toBe(39000);
  });
});
