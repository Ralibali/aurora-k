import { describe, expect, it } from 'vitest';
import { daysUntil, expiryStatus, validateDriverDocumentFile } from '@/lib/compliance';

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('file validation', () => {
  it('accepts supported documents smaller than 10 MB', () => {
    expect(validateDriverDocumentFile({ type: 'application/pdf', size: 1024 })).toBe('pdf');
    expect(validateDriverDocumentFile({ type: 'image/jpeg', size: 1024 })).toBe('jpg');
  });
  it('rejects oversized or unsafe document types', () => {
    expect(() => validateDriverDocumentFile({ type: 'text/html', size: 200 })).toThrow('Endast PDF');
    expect(() => validateDriverDocumentFile({ type: 'application/pdf', size: 11 * 1024 * 1024 })).toThrow('10 MB');
  });
});

describe('expiryStatus', () => {
  it('returnerar none utan datum', () => {
    expect(expiryStatus(null)).toBe('none');
  });

  it('returnerar expired för passerade datum', () => {
    expect(expiryStatus(dateOffset(-1))).toBe('expired');
    expect(expiryStatus(dateOffset(-90))).toBe('expired');
  });

  it('returnerar warning inom 30 dagar', () => {
    expect(expiryStatus(dateOffset(0))).toBe('warning');
    expect(expiryStatus(dateOffset(15))).toBe('warning');
    expect(expiryStatus(dateOffset(30))).toBe('warning');
  });

  it('returnerar ok efter varningsfönstret', () => {
    expect(expiryStatus(dateOffset(31))).toBe('ok');
    expect(expiryStatus(dateOffset(365))).toBe('ok');
  });
});

describe('daysUntil', () => {
  it('räknar dagar korrekt', () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(dateOffset(10))).toBe(10);
    expect(daysUntil(dateOffset(-5))).toBe(-5);
  });
});
