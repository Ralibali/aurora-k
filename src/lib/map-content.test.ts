import { describe, expect, it } from 'vitest';
import { isValidMapCoordinate, mapPopup, mapTimeAgo } from './map-content';
describe('safe map data', () => {
  it('accepts the equator/prime meridian and rejects nonfinite, absent or out-of-range points', () => {
    expect(isValidMapCoordinate(0, 0)).toBe(true);
    expect(isValidMapCoordinate(-90, 180)).toBe(true);
    for (const [lat, lng] of [[null, 0], [undefined, 0], [NaN, 0], [Infinity, 0], [0, -181], [91, 0], ['0', 0]]) expect(isValidMapCoordinate(lat, lng)).toBe(false);
  });
  it('renders untrusted titles, names and addresses as text, with a fixed internal link', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const content = mapPopup(payload, ['<script>alert(1)</script>', 'A & B'], '../" onclick="alert(1)');
    expect(content.querySelector('img,script')).toBeNull();
    expect(content.textContent).toContain(payload);
    expect(content.querySelector('a')?.getAttribute('href')).toBe('/admin/assignments/..%2F%22%20onclick%3D%22alert(1)');
    expect(content.querySelector('a')?.getAttribute('onclick')).toBeNull();
  });
  it('does not show NaN or negative update ages', () => {
    expect(mapTimeAgo('bad')).toBe('okänt');
    expect(mapTimeAgo(new Date(Date.now() + 60000).toISOString())).toBe('0s sedan');
  });
});
