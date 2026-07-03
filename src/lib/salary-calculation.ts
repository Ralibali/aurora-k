export type SalaryPeriodMode = 'week' | 'month';

export type SalaryAssignment = {
  assigned_driver_id: string | null;
  actual_start: string | null;
  actual_stop: string | null;
};

export type SalaryDriver = { id: string; full_name: string };
export type DriverCompensation = {
  driver_id: string;
  compensation_type: 'hourly' | 'per_assignment' | 'monthly' | string;
  hourly_rate?: number | null;
  per_assignment_rate?: number | null;
  monthly_salary?: number | null;
  tax_table?: string | null;
};
export type ObRate = {
  active: boolean;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  applies_to_weekdays: boolean;
  applies_to_saturdays: boolean;
  applies_to_sundays: boolean;
};
export type PerDiemRate = { active: boolean; min_hours: number; amount: number };

export type SalaryRow = {
  driverId: string;
  name: string;
  payType: string;
  hours: number;
  assignments: number;
  grossPay: number;
  obTotal: number;
  perDiemTot: number;
  total: number;
  taxTable: string;
};

function validInterval(assignment: SalaryAssignment) {
  if (!assignment.actual_start || !assignment.actual_stop) return null;
  const start = new Date(assignment.actual_start);
  const stop = new Date(assignment.actual_stop);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(stop.getTime()) || stop <= start) return null;
  return { start, stop };
}

export function workedHours(assignments: SalaryAssignment[]) {
  return assignments.reduce((sum, assignment) => {
    const interval = validInterval(assignment);
    return sum + (interval ? (interval.stop.getTime() - interval.start.getTime()) / 3_600_000 : 0);
  }, 0);
}

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function appliesOnDate(rate: ObRate, date: Date) {
  const day = date.getDay();
  if (day === 0) return rate.applies_to_sundays;
  if (day === 6) return rate.applies_to_saturdays;
  return rate.applies_to_weekdays;
}

function withinRateWindow(rate: ObRate, date: Date) {
  const [startHour, startMinute] = rate.start_time.split(':').map(Number);
  const [endHour, endMinute] = rate.end_time.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const minute = minuteOfDay(date);
  if (start === end) return true;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

export function calculateObBreakdown(assignments: SalaryAssignment[], rates: ObRate[]) {
  const activeRates = rates.filter(rate => rate.active);
  let amount = 0;
  let minutesWithOb = 0;

  assignments.forEach(assignment => {
    const interval = validInterval(assignment);
    if (!interval) return;
    const maxMinutes = 7 * 24 * 60;
    const durationMinutes = Math.min(maxMinutes, Math.ceil((interval.stop.getTime() - interval.start.getTime()) / 60_000));

    for (let index = 0; index < durationMinutes; index += 1) {
      const minute = new Date(interval.start.getTime() + index * 60_000);
      if (minute >= interval.stop) break;
      const rate = activeRates
        .filter(item => appliesOnDate(item, minute) && withinRateWindow(item, minute))
        .reduce((highest, item) => Math.max(highest, Number(item.rate_per_hour) || 0), 0);
      if (rate > 0) minutesWithOb += 1;
      amount += rate / 60;
    }
  });

  return { hours: minutesWithOb / 60, amount };
}

export function calculateObAmount(assignments: SalaryAssignment[], rates: ObRate[]) {
  return calculateObBreakdown(assignments, rates).amount;
}

export function calculatePerDiem(assignments: SalaryAssignment[], rates: PerDiemRate[]) {
  const activeRates = rates.filter(rate => rate.active).sort((a, b) => Number(b.min_hours) - Number(a.min_hours));
  const minutesByDate = new Map<string, number>();

  assignments.forEach(assignment => {
    const interval = validInterval(assignment);
    if (!interval) return;
    const maxMinutes = 7 * 24 * 60;
    const durationMinutes = Math.min(maxMinutes, Math.ceil((interval.stop.getTime() - interval.start.getTime()) / 60_000));

    for (let index = 0; index < durationMinutes; index += 1) {
      const minute = new Date(interval.start.getTime() + index * 60_000);
      if (minute >= interval.stop) break;
      const key = `${minute.getFullYear()}-${String(minute.getMonth() + 1).padStart(2, '0')}-${String(minute.getDate()).padStart(2, '0')}`;
      minutesByDate.set(key, (minutesByDate.get(key) ?? 0) + 1);
    }
  });

  let total = 0;
  minutesByDate.forEach(minutes => {
    const match = activeRates.find(rate => minutes / 60 >= Number(rate.min_hours));
    if (match) total += Number(match.amount) || 0;
  });
  return total;
}

export function computeSalary(
  assignments: SalaryAssignment[],
  drivers: SalaryDriver[],
  compensations: DriverCompensation[],
  obRates: ObRate[],
  perDiemRates: PerDiemRate[],
  periodMode: SalaryPeriodMode,
) {
  const compensationMap = new Map(compensations.map(item => [item.driver_id, item]));
  const driverIds = new Set(assignments.map(item => item.assigned_driver_id).filter((id): id is string => Boolean(id)));
  compensations.filter(item => item.compensation_type === 'monthly').forEach(item => driverIds.add(item.driver_id));

  const rows: SalaryRow[] = [...driverIds].map(driverId => {
    const driver = drivers.find(item => item.id === driverId);
    const compensation = compensationMap.get(driverId);
    const driverAssignments = assignments.filter(item => item.assigned_driver_id === driverId && validInterval(item));
    const hours = workedHours(driverAssignments);
    const assignmentCount = driverAssignments.length;

    let grossPay = 0;
    let payType = 'Ej angiven';
    if (compensation?.compensation_type === 'hourly') {
      const rate = Number(compensation.hourly_rate) || 0;
      grossPay = hours * rate;
      payType = `${rate.toFixed(0)} kr/h`;
    } else if (compensation?.compensation_type === 'per_assignment') {
      const rate = Number(compensation.per_assignment_rate) || 0;
      grossPay = assignmentCount * rate;
      payType = `${rate.toFixed(0)} kr/uppdrag`;
    } else if (compensation?.compensation_type === 'monthly') {
      const salary = Number(compensation.monthly_salary) || 0;
      grossPay = periodMode === 'month' ? salary : salary * 12 / 52;
      payType = `${salary.toFixed(0)} kr/mån`;
    }

    const obTotal = calculateObAmount(driverAssignments, obRates);
    const perDiemTot = calculatePerDiem(driverAssignments, perDiemRates);
    return {
      driverId,
      name: driver?.full_name ?? 'Okänd',
      payType,
      hours,
      assignments: assignmentCount,
      grossPay,
      obTotal,
      perDiemTot,
      total: grossPay + obTotal + perDiemTot,
      taxTable: compensation?.tax_table ?? '',
    };
  });

  const totalGross = rows.reduce((sum, row) => sum + row.grossPay, 0);
  const totalOb = rows.reduce((sum, row) => sum + row.obTotal, 0);
  const totalPerDiem = rows.reduce((sum, row) => sum + row.perDiemTot, 0);
  return { rows, totalGross, totalOb, totalPerDiem, grandTotal: totalGross + totalOb + totalPerDiem };
}
