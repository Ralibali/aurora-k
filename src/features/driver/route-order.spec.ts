import { describe, expect, it } from 'vitest';
import { compareRouteOrder } from './route-order';

describe('driver route order', () => {
  it('sorts by saved sequence', () => {
    const rows = [
      { scheduled_start: '2026-06-26T08:00:00Z', route_sequence: 2 },
      { scheduled_start: '2026-06-26T10:00:00Z', route_sequence: 1 },
    ];
    expect(rows.sort(compareRouteOrder)[0].route_sequence).toBe(1);
  });

  it('uses time when sequence is missing', () => {
    const rows = [
      { scheduled_start: '2026-06-26T10:00:00Z' },
      { scheduled_start: '2026-06-26T08:00:00Z' },
    ];
    expect(rows.sort(compareRouteOrder)[0].scheduled_start).toContain('08:00');
  });
});
