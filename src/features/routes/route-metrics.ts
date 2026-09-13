export function savedDistancePercent(before: number | null, after: number | null) {
  if (!before || after == null || before <= after) return 0;
  return Math.round(((before - after) / before) * 100);
}
