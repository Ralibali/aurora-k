import { describe, expect, it } from 'vitest';
import { assignmentErrorMessage, buildServiceInstructions, emptyServiceDetails, validateServiceDetails } from './assignment-services';

describe('container and crane job briefs', () => {
  it('keeps both container identifiers, rental terms and the existing instructions', () => {
    const instructions = buildServiceInstructions('Container – byte', {
      ...emptyServiceDetails, containerId: 'C-024', returnContainerId: 'C-018', volume: '10',
      material: 'Trä', rentalEnd: '2026-10-05', dailyRent: '80', contact: 'Platschef 0700000000',
    }, 'Ring före ankomst.');
    expect(instructions).toContain('Ring före ankomst.');
    expect(instructions).toContain('Container ut: C-024');
    expect(instructions).toContain('Container in: C-018');
    expect(instructions).toContain('Volym: 10 m³');
    expect(instructions).toContain('Planerad hämtning (bokas separat): 2026-10-05');
    expect(instructions).toContain('Avtalad dygnshyra exkl. moms: 80 kr/dygn');
  });
  it('does not leak container fields into a crane job after switching templates', () => {
    const instructions = buildServiceInstructions('Kranbil – lyft', {
      ...emptyServiceDetails, containerId: 'C-024', dailyRent: '80', cargo: 'Maskin', weight: '2500', reach: '12', liftHeight: '8',
    }, '');
    expect(instructions).toContain('Uppgiven vikt: 2500 kg');
    expect(instructions).toContain('Önskad räckvidd: 12 m');
    expect(instructions).not.toContain('C-024');
    expect(instructions).not.toContain('dygnshyra');
  });
  it('leaves ordinary transport instructions intact', () => {
    expect(buildServiceInstructions('Budbil', { ...emptyServiceDetails, weight: '2500' }, '  Pallar  ')).toBe('Pallar');
  });
  it('rejects collection dates before placement and invalid numeric values', () => {
    expect(validateServiceDetails('Container – utsättning', { ...emptyServiceDetails, rentalEnd: '2026-09-27' }, '2026-09-28T08:00')).toMatch(/före/);
    expect(validateServiceDetails('Kranbil', { ...emptyServiceDetails, weight: '-1' }, '2026-09-28')).toMatch(/giltiga/);
  });
  it('reads PostgREST error objects and offers a useful correction', () => {
    expect(assignmentErrorMessage({ code: '23503', message: 'foreign key violation' })).toMatch(/vald kund, chaufför/);
    expect(assignmentErrorMessage({ code: '42501', message: 'RLS' })).toMatch(/behörighet/);
    expect(assignmentErrorMessage({ code: 'XX000' })).toContain('Dina uppgifter finns kvar');
  });
});
