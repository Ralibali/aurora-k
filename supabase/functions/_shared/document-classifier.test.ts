import { describe, expect, it } from 'vitest';
import { classifyTransportDocument, detectSignature, extractAmount } from './document-classifier.ts';
import { parseInboundOrder, parseTransportDocument } from './order-parser.ts';

describe('classifyTransportDocument', () => {
  it('identifies transport orders', () => {
    expect(classifyTransportDocument('Transportorder 1001\nHämtning: A\nLeverans: B').documentType).toBe('transport_order');
  });

  it('identifies proof of delivery', () => {
    expect(classifyTransportDocument('Leveransbevis\nGodset mottaget av Anna').documentType).toBe('pod');
  });

  it('identifies CMR consignment notes', () => {
    expect(classifyTransportDocument('CMR fraktsedel nr 8842').documentType).toBe('cmr');
  });

  it('returns unknown for unrelated text', () => {
    expect(classifyTransportDocument('Hej, trevlig helg!')).toEqual({ documentType: 'unknown', typeConfidence: 0 });
  });
});

describe('extractAmount and detectSignature', () => {
  it('reads labelled Swedish amounts', () => {
    expect(extractAmount('Belopp: 2 450,50 SEK')).toEqual({ amount: 2450.5, currency: 'SEK' });
    expect(extractAmount('Totalt 1 200 kr')).toEqual({ amount: 1200, currency: 'SEK' });
  });

  it('returns null when no amount exists', () => {
    expect(extractAmount('Inget pris angivet')).toEqual({ amount: null, currency: '' });
  });

  it('detects signature wording', () => {
    expect(detectSignature('Underskrift: Anna A')).toBe(true);
    expect(detectSignature('Inget kvitto')).toBe(false);
  });
});

describe('parseTransportDocument', () => {
  const pod = `Leveransbevis
Ordernr: ORD-1001
Kund: Byggpartner AB
Hämtning: Industrigatan 12, Linköping
Leverans: Storgatan 4, Norrköping
Datum: 2026-07-02 09:30
Vikt: 450 kg
Belopp: 2 450 SEK
Mottaget av: Anna Andersson`;

  it('returns document type, fields and confidences', () => {
    const result = parseTransportDocument(pod);
    expect(result.documentType).toBe('pod');
    expect(result.signatureDetected).toBe(true);
    expect(result.fields).toMatchObject({
      orderReference: 'ORD-1001',
      customerName: 'Byggpartner AB',
      weightKg: 450,
      amount: 2450,
      currency: 'SEK',
    });
    expect(result.fieldConfidence.customerName).toBeGreaterThan(80);
    expect(result.confidence).toBeGreaterThan(70);
    expect(result.requiresReview).toBe(false);
  });

  it('requires review for sparse unknown documents', () => {
    const result = parseTransportDocument('Hej! Kan ni ringa mig?');
    expect(result.documentType).toBe('unknown');
    expect(result.requiresReview).toBe(true);
    expect(result.fields.customerName).toBe('');
  });

  it('does not change parseInboundOrder behaviour', () => {
    const order = parseInboundOrder(pod);
    expect(parseTransportDocument(pod).order).toEqual(order);
  });
});
