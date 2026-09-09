import { describe, expect, it } from 'vitest';
import { parseInboundOrder } from './order-parser.ts';

describe('parseInboundOrder – organisationsnummer', () => {
  it('tolkar inte ett telefonnummer som organisationsnummer', () => {
    const result = parseInboundOrder(
      'Hämtning: Storgatan 1, Göteborg\nLämning: Kungsgatan 4, Borås\nTelefon: 070-123 45 67',
      'Transport imorgon',
    );
    expect(result.organizationNumber).toBe('');
    expect(result.contactPhone).toBe('070-123 45 67');
  });

  it('tolkar inte en numerisk referens som organisationsnummer', () => {
    const result = parseInboundOrder('Ordernummer: 5561234567\nGods: 3 pallar', 'Bokning');
    expect(result.organizationNumber).toBe('');
    expect(result.orderReference).toBe('5561234567');
  });

  it('plockar ut märkta organisationsnummer i olika format', () => {
    for (const label of ['Org.nr', 'org nr', 'Organisationsnummer:', 'orgnr']) {
      const result = parseInboundOrder(`${label} 556123-4567\nTelefon: 070-123 45 67`, 'Bokning');
      expect(result.organizationNumber.replace(/\s/g, '')).toBe('556123-4567');
      expect(result.contactPhone).toBe('070-123 45 67');
    }
  });

  it('hanterar tolvsiffrigt organisationsnummer', () => {
    const result = parseInboundOrder('Org nr: 165561234567', 'Bokning');
    expect(result.organizationNumber).toBe('165561234567');
  });
});
