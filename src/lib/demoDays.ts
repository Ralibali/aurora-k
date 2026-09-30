/** Calendar dates for the weekday labels shown in the visitor's local time. */
export function upcomingDemoDays(now = new Date()) {
  const days: { value: string; offset: number; weekday: number; day: number; month: number }[] = [];
  for (let offset = 0; offset < 14 && days.length < 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    days.push({ value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, offset, weekday, day, month });
  }
  return days;
}
