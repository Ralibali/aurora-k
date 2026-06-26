export type ParsedTransportOrder = {
  title: string;
  customerName: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledStart: string;
  instructions: string;
  serviceType: string;
  contactName: string;
  contactPhone: string;
  confidence: number;
};

const LABELS: Record<string, keyof ParsedTransportOrder> = {
  kund: 'customerName',
  customer: 'customerName',
  hämtning: 'pickupAddress',
  hamtning: 'pickupAddress',
  pickup: 'pickupAddress',
  från: 'pickupAddress',
  fran: 'pickupAddress',
  leverans: 'deliveryAddress',
  delivery: 'deliveryAddress',
  till: 'deliveryAddress',
  datum: 'scheduledStart',
  date: 'scheduledStart',
  tid: 'scheduledStart',
  time: 'scheduledStart',
  kontakt: 'contactName',
  contact: 'contactName',
  telefon: 'contactPhone',
  phone: 'contactPhone',
  tel: 'contactPhone',
  gods: 'instructions',
  instruktion: 'instructions',
  instruktioner: 'instructions',
  instructions: 'instructions',
  uppdrag: 'title',
  order: 'title',
  tjänst: 'serviceType',
  tjanst: 'serviceType',
  service: 'serviceType',
};

function clean(value: string) {
  return value.replace(/^[-–—•\s]+/, '').trim();
}

function findLabelledValues(text: string) {
  const values: Partial<Record<keyof ParsedTransportOrder, string>> = {};
  text.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^:]{2,30})\s*:\s*(.+)$/);
    if (!match) return;
    const label = match[1].trim().toLowerCase();
    const key = LABELS[label];
    if (!key) return;
    const value = clean(match[2]);
    if (!value) return;
    if (key === 'instructions' && values.instructions) values.instructions += `\n${value}`;
    else values[key] = value;
  });
  return values;
}

function parseDateTime(value: string) {
  if (!value) return '';
  const normalized = value.trim().replace(/\s+kl\.?\s*/i, ' ').replace(/\./g, '-');
  const iso = normalized.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})[:.]?(\d{2})?)?/);
  if (iso) {
    const [, year, month, day, hour = '08', minute = '00'] = iso;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  const european = normalized.match(/(\d{1,2})[-/]([01]?\d)(?:[-/](20\d{2}))?(?:\s+(\d{1,2})[:.]?(\d{2})?)?/);
  if (european) {
    const [, day, month, year = String(new Date().getFullYear()), hour = '08', minute = '00'] = european;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  return '';
}

function findPhone(text: string) {
  const match = text.match(/(?:\+46|0)[\d\s-]{7,14}/);
  return match ? match[0].trim() : '';
}

function inferAddresses(text: string) {
  const candidates = text
    .split(/\r?\n/)
    .map(clean)
    .filter(line => /\b\d{1,4}[A-Za-z]?\b/.test(line) && /[A-Za-zÅÄÖåäö]{3,}/.test(line))
    .filter(line => !/telefon|tel|org|order|kund/i.test(line));
  return { pickupAddress: candidates[0] ?? '', deliveryAddress: candidates[1] ?? '' };
}

function inferServiceType(text: string) {
  const normalized = text.toLowerCase();
  const options = ['Kranbil', 'Budbil', 'Tippbil', 'Krokbil', 'TMA-skydd', 'Byggsäck', 'Maskintransport'];
  return options.find(option => normalized.includes(option.toLowerCase())) ?? '';
}

export function parseTransportOrder(text: string): ParsedTransportOrder {
  const labelled = findLabelledValues(text);
  const inferredAddresses = inferAddresses(text);
  const firstUsefulLine = text.split(/\r?\n/).map(clean).find(line => line.length > 4 && !line.includes(':')) ?? '';
  const instructions = labelled.instructions ?? text.trim();
  const result: ParsedTransportOrder = {
    title: labelled.title || firstUsefulLine.slice(0, 120) || 'Transportuppdrag',
    customerName: labelled.customerName ?? '',
    pickupAddress: labelled.pickupAddress || inferredAddresses.pickupAddress,
    deliveryAddress: labelled.deliveryAddress || inferredAddresses.deliveryAddress,
    scheduledStart: parseDateTime(labelled.scheduledStart ?? text),
    instructions,
    serviceType: labelled.serviceType || inferServiceType(text),
    contactName: labelled.contactName ?? '',
    contactPhone: labelled.contactPhone || findPhone(text),
    confidence: 0,
  };

  const important = [result.title, result.customerName, result.pickupAddress, result.deliveryAddress, result.scheduledStart];
  result.confidence = Math.round((important.filter(Boolean).length / important.length) * 100);
  return result;
}

export function parseTransportCsv(csv: string): ParsedTransportOrder[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(value => value.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = line.split(delimiter).map(value => value.trim().replace(/^"|"$/g, ''));
    const labelledText = headers.map((header, index) => `${header}: ${cells[index] ?? ''}`).join('\n');
    return parseTransportOrder(labelledText);
  }).filter(order => order.title || order.pickupAddress || order.deliveryAddress);
}
