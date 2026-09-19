export function savedDistancePercent(before: number | null, after: number | null) {
  if (!before || after == null || before <= after) return 0;
  return Math.round(((before - after) / before) * 100);
}

export function savedDurationSeconds(before: number | null, after: number | null) {
  if (!before || after == null || before <= after) return 0;
  return before - after;
}

export function savedDurationPercent(before: number | null, after: number | null) {
  if (!before || after == null || before <= after) return 0;
  return Math.round(((before - after) / before) * 100);
}
