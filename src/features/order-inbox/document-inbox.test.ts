import { describe, expect, it } from 'vitest';
import {
  matchAssignment,
  matchCustomer,
  normalizeDocumentFields,
  requiresManualReview,
  validateDocumentFile,
  emptyDocumentFields,
} from '@/features/order-inbox/document-inbox';
import { parseTransportCsv, parseTransportOrder } from '@/lib/order-parser';

const customers = [
  { id: 'c1', name: 'Byggpartner AB', org_number: '556677-8899' },
  { id: 'c2', name: 'Norrköpings Frakt AB', org_number: null },
];

function file(name: string, type: string, size: number) {
  return { name, type, size } as File;
}

describe('validateDocumentFile', () => {
  it('accepts pdf and mobile photos', () => {
    expect(validateDocumentFile(file('order.pdf', 'application/pdf', 1000))).toBeNull();
    expect(validateDocumentFile(file('foto.jpg', 'image/jpeg', 1000))).toBeNull();
    expect(validateDocumentFile(file('bild.webp', 'image/webp', 1000))).toBeNull();
  });

  it('rejects unsupported types, empty and oversized files', () => {
    expect(validateDocumentFile(file('order.docx', 'application/msword', 1000))).toMatch(/stöds inte/);
    expect(validateDocumentFile(file('order.pdf', 'application/pdf', 0))).toMatch(/tom/);
    expect(validateDocumentFile(file('order.pdf', 'application/pdf', 21 * 1024 * 1024))).toMatch(/20 MB/);
  });
});

describe('normalizeDocumentFields', () => {
  it('leaves unknown fields empty and never invents values', () => {
    const fields = normalizeDocumentFields({ customerName: '  Byggpartner AB ', weightKg: '450' as unknown as number });
    expect(fields.customerName).toBe('Byggpartner AB');
    expect(fields.weightKg).toBe(450);
    expect(fields.pickupAddress).toBe('');
    expect(fields.amount).toBeNull();
  });
});

describe('matchCustomer', () => {
  it('matches on organization number', () => {
    const match = matchCustomer({ ...emptyDocumentFields(), organizationNumber: '5566778899' }, customers);
    expect(match).toMatchObject({ customerId: 'c1' });
  });

  it('matches on normalized name', () => {
    const match = matchCustomer({ ...emptyDocumentFields(), customerName: 'byggpartner ab' }, customers);
    expect(match?.customerId).toBe('c1');
  });

  it('returns no match for unknown customers', () => {
    expect(matchCustomer({ ...emptyDocumentFields(), customerName: 'Helt Okänd Kund' }, customers)).toBeNull();
  });
});

describe('matchAssignment', () => {
  const assignments = [
    { id: 'a1', title: 'Leverans ORD-1001', instructions: null, customer_id: 'c1', scheduled_start: '2026-07-02T09:30:00Z' },
    { id: 'a2', title: 'Leverans till hamnen', instructions: null, customer_id: 'c2', scheduled_start: '2026-07-03T08:00:00Z' },
  ];

  it('matches on reference', () => {
    const match = matchAssignment({ ...emptyDocumentFields(), orderReference: 'ORD-1001' }, '', assignments);
    expect(match).toMatchObject({ assignmentId: 'a1' });
  });

  it('suggests customer and date match with lower confidence', () => {
    const match = matchAssignment({ ...emptyDocumentFields(), scheduledStart: '2026-07-03T10:00' }, 'c2', assignments);
    expect(match?.assignmentId).toBe('a2');
    expect(match?.confidence).toBeLessThan(80);
  });

  it('returns null when nothing is certain', () => {
    expect(matchAssignment(emptyDocumentFields(), '', assignments)).toBeNull();
  });
});

describe('requiresManualReview', () => {
  it('flags low confidence and unknown document types', () => {
    expect(requiresManualReview(45, 'transport_order')).toBe(true);
    expect(requiresManualReview(95, 'unknown')).toBe(true);
    expect(requiresManualReview(95, 'pod')).toBe(false);
  });
});

describe('regression: befintlig orderimport', () => {
  it('still parses labelled orders and CSV as before', () => {
    const order = parseTransportOrder('Uppdrag: Bud\nKund: Kund AB\nHämtning: A-gatan 1\nLeverans: B-gatan 2\nDatum: 2026-07-02 09:30');
    expect(order).toMatchObject({ title: 'Bud', customerName: 'Kund AB', scheduledStart: '2026-07-02T09:30' });
    expect(order.confidence).toBe(100);
    const csv = parseTransportCsv('uppdrag;kund;hämtning;leverans;datum\nBud;Kund AB;A-gatan 1;B-gatan 2;2026-07-03 08:00');
    expect(csv).toHaveLength(1);
    expect(csv[0].customerName).toBe('Kund AB');
  });
});
