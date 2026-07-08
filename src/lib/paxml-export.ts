// PAXml 2.2 löneexport – https://www.paxml.se
// Genererar en <paxml>-fil (LÖNIN) från slutförda uppdrag + ersättningsregler.
import { calculateObBreakdown, workedHours, type DriverCompensation, type ObRate, type PerDiemRate, type SalaryAssignment, type SalaryDriver } from './salary-calculation';

export type PaxmlDriver = SalaryDriver & {
  personnummer?: string | null;
  personal_number?: string | null;
  employee_id?: string | null;
  employeeId?: string | null;
};

export type PaxmlAssignment = SalaryAssignment & {
  id?: string;
  actual_start: string | null;
  actual_stop: string | null;
};

export type PaxmlBuildInput = {
  periodStart: Date;
  periodEnd: Date;
  assignments: PaxmlAssignment[];
  drivers: PaxmlDriver[];
  compensations: DriverCompensation[];
  obRates: ObRate[];
  perDiemRates: PerDiemRate[];
  companyName?: string;
  systemVersion?: string;
};

export type PaxmlValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  transactionCount: number;
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (ch) => (
    ch === '<' ? '&lt;' :
    ch === '>' ? '&gt;' :
    ch === '&' ? '&amp;' :
    ch === "'" ? '&apos;' :
    '&quot;'
  ));
}

function fmtDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtDateTime(date: Date) {
  const iso = date.toISOString();
  return iso.slice(0, 19); // YYYY-MM-DDTHH:MM:SS
}

function num(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(decimals);
}

function driverEmpId(driver: PaxmlDriver): string {
  return (
    driver.employee_id ||
    driver.employeeId ||
    driver.personnummer ||
    driver.personal_number ||
    driver.id
  );
}

function daySpan(startIso: string, stopIso: string) {
  const start = new Date(startIso);
  const stop = new Date(stopIso);
  const hours = (stop.getTime() - start.getTime()) / 3_600_000;
  return { start, stop, hours };
}

/** Validate build input. Called before generating XML. */
export function validatePaxml(input: PaxmlBuildInput): PaxmlValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let transactionCount = 0;

  if (!input.assignments.length) errors.push('Inga slutförda uppdrag i perioden.');
  if (!input.drivers.length) errors.push('Inga chaufförer.');

  const compByDriver = new Map(input.compensations.map((c) => [c.driver_id, c]));
  const driverById = new Map(input.drivers.map((d) => [d.id, d]));
  const seenDrivers = new Set<string>();

  for (const a of input.assignments) {
    if (!a.assigned_driver_id) {
      warnings.push('Uppdrag utan tilldelad chaufför – hoppas över.');
      continue;
    }
    if (!a.actual_start || !a.actual_stop) {
      warnings.push('Uppdrag saknar start-/stopptid – hoppas över.');
      continue;
    }
    const driver = driverById.get(a.assigned_driver_id);
    if (!driver) {
      warnings.push(`Chaufför ${a.assigned_driver_id} saknas i registret.`);
      continue;
    }
    seenDrivers.add(driver.id);
    transactionCount++;
  }

  for (const driverId of seenDrivers) {
    const driver = driverById.get(driverId)!;
    if (!compByDriver.has(driverId)) {
      warnings.push(`${driver.full_name}: ingen ersättningsregel – exporten använder 0 kr som lön.`);
    }
    if (!driver.personnummer && !driver.personal_number && !driver.employee_id && !driver.employeeId) {
      warnings.push(`${driver.full_name}: saknar personnummer/anställningsnr – använder internt id som empid.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, transactionCount };
}

/** Build a PAXml 2.2 LÖNIN XML string from the given period. */
export function buildPaxml(input: PaxmlBuildInput): string {
  const compByDriver = new Map(input.compensations.map((c) => [c.driver_id, c]));
  const driverById = new Map(input.drivers.map((d) => [d.id, d]));
  const perDiem = (input.perDiemRates || []).filter((p) => p.active !== false);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<paxml xmlns="http://www.paxml.se/2.2/paxml">');
  lines.push('  <header>');
  lines.push('    <format>LÖNIN</format>');
  lines.push('    <version>2.2</version>');
  lines.push(`    <systemname>${escapeXml(input.companyName || 'Aurora Transport')}</systemname>`);
  lines.push(`    <systemversion>${escapeXml(input.systemVersion || '1.0')}</systemversion>`);
  lines.push(`    <created>${fmtDateTime(new Date())}</created>`);
  lines.push('  </header>');
  lines.push('  <salary>');
  lines.push('    <transactions>');

  // group assignments by driver
  const byDriver = new Map<string, PaxmlAssignment[]>();
  for (const a of input.assignments) {
    if (!a.assigned_driver_id || !a.actual_start || !a.actual_stop) continue;
    if (!driverById.has(a.assigned_driver_id)) continue;
    const list = byDriver.get(a.assigned_driver_id) ?? [];
    list.push(a);
    byDriver.set(a.assigned_driver_id, list);
  }

  for (const [driverId, driverAssignments] of byDriver) {
    const driver = driverById.get(driverId)!;
    const comp = compByDriver.get(driverId);
    const empid = escapeXml(driverEmpId(driver));

    // per-assignment lines: worked hours (TIM) + OB tillägg
    for (const a of driverAssignments) {
      const { start, hours } = daySpan(a.actual_start!, a.actual_stop!);
      const dateStr = fmtDate(start);

      if (comp?.compensation_type === 'hourly' && hours > 0) {
        const rate = Number(comp.hourly_rate || 0);
        lines.push('      <salarytrans>');
        lines.push(`        <empid>${empid}</empid>`);
        lines.push('        <salarycode>TIM</salarycode>');
        lines.push(`        <date>${dateStr}</date>`);
        lines.push(`        <hours>${num(hours)}</hours>`);
        lines.push(`        <price>${num(rate)}</price>`);
        lines.push('      </salarytrans>');
      } else if (comp?.compensation_type === 'per_assignment') {
        const rate = Number(comp.per_assignment_rate || 0);
        lines.push('      <salarytrans>');
        lines.push(`        <empid>${empid}</empid>`);
        lines.push('        <salarycode>ACK</salarycode>');
        lines.push(`        <date>${dateStr}</date>`);
        lines.push('        <units>1</units>');
        lines.push(`        <price>${num(rate)}</price>`);
        lines.push('      </salarytrans>');
      }

      // OB
      const ob = calculateObBreakdown([a] as any, input.obRates || []);
      if (ob.hours > 0 && ob.amount > 0) {
        lines.push('      <salarytrans>');
        lines.push(`        <empid>${empid}</empid>`);
        lines.push('        <salarycode>OB1</salarycode>');
        lines.push(`        <date>${dateStr}</date>`);
        lines.push(`        <hours>${num(ob.hours)}</hours>`);
        lines.push(`        <price>${num(ob.amount / ob.hours)}</price>`);
        lines.push('      </salarytrans>');
      }

      // Traktamente – matcha första nivå där hours >= min_hours (högsta först)
      if (perDiem.length && hours > 0) {
        const match = [...perDiem].sort((a, b) => b.min_hours - a.min_hours).find((p) => hours >= p.min_hours);
        if (match) {
          lines.push('      <salarytrans>');
          lines.push(`        <empid>${empid}</empid>`);
          lines.push('        <salarycode>TRAKT</salarycode>');
          lines.push(`        <date>${dateStr}</date>`);
          lines.push('        <units>1</units>');
          lines.push(`        <price>${num(match.amount)}</price>`);
          lines.push('      </salarytrans>');
        }
      }
    }

    // Månadslön: en post per period
    if (comp?.compensation_type === 'monthly') {
      const salary = Number(comp.monthly_salary || 0);
      lines.push('      <salarytrans>');
      lines.push(`        <empid>${empid}</empid>`);
      lines.push('        <salarycode>MÅN</salarycode>');
      lines.push(`        <date>${fmtDate(input.periodEnd)}</date>`);
      lines.push('        <units>1</units>');
      lines.push(`        <price>${num(salary)}</price>`);
      lines.push('      </salarytrans>');
    }
  }

  // fallback if no rows
  const _totalWorked = workedHours(input.assignments);
  void _totalWorked;

  lines.push('    </transactions>');
  lines.push('  </salary>');
  lines.push('</paxml>');
  return lines.join('\n');
}

export function paxmlFileName(periodStart: Date) {
  const y = periodStart.getFullYear();
  const m = String(periodStart.getMonth() + 1).padStart(2, '0');
  return `paxml-lonin-${y}-${m}.xml`;
}