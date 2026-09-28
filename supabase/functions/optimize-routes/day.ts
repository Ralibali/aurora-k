/** Derive Swedish calendar boundaries server-side, including DST transitions. */
export function stockholmDayBounds(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  const midnight = (utcDay: Date) => {
    let candidate = utcDay.getTime();
    for (let n = 0; n < 3; n++) {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', timeZoneName: 'shortOffset' }).formatToParts(candidate);
      const offset = Number(parts.find(p => p.type === 'timeZoneName')?.value.replace('GMT', ''));
      if (!Number.isFinite(offset)) throw new Error('Invalid timezone');
      candidate = utcDay.getTime() - offset * 3600000;
    }
    return new Date(candidate).toISOString();
  };
  return { dayStart: midnight(day), dayEnd: midnight(new Date(day.getTime() + 86400000)) };
}
