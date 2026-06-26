import { describe, expect, it } from 'vitest';
import { parseTransportCsv, parseTransportOrder } from '@/lib/order-parser';

describe('parseTransportOrder', () => {
  it('reads labelled Swedish transport orders', () => {
    const order = parseTransportOrder(`
Uppdrag: Expressleverans
Kund: Byggpartner AB
Hämtning: Industrigatan 12, Linköping
Leverans: Storgatan 4, Norrköping
Datum: 2026-07-02 09:30
Telefon: 070-123 45 67
Gods: 4 pallar, ring före ankomst
`);

    expect(order).toMatchObject({
      title: 'Expressleverans',
      customerName: 'Byggpartner AB',
      pickupAddress: 'Industrigatan 12, Linköping',
      deliveryAddress: 'Storgatan 4, Norrköping',
      scheduledStart: '2026-07-02T09:30',
      contactPhone: '070-123 45 67',
    });
    expect(order.confidence).toBe(100);
  });

  it('infers addresses and service type from free text', () => {
    const order = parseTransportOrder(`Budbil behövs imorgon
Hämta på Tornbyvägen 3 Linköping
Lämna på Hospitalsgatan 8 Norrköping
Ring 073-555 44 33`);

    expect(order.serviceType).toBe('Budbil');
    expect(order.pickupAddress).toContain('Tornbyvägen 3');
    expect(order.deliveryAddress).toContain('Hospitalsgatan 8');
    expect(order.contactPhone).toContain('073-555');
  });

  it('imports semicolon separated CSV', () => {
    const orders = parseTransportCsv('uppdrag;kund;hämtning;leverans;datum\nBud;Kund AB;A-gatan 1;B-gatan 2;2026-07-03 08:00');
    expect(orders).toHaveLength(1);
    expect(orders[0].customerName).toBe('Kund AB');
    expect(orders[0].scheduledStart).toBe('2026-07-03T08:00');
  });
});
