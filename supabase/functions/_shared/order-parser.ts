export type ParsedInboundOrder = {
  title: string;
  customerName: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledStart: string;
  instructions: string;
  serviceType: string;
  contactName: string;
  contactPhone: string;
  orderReference: string;
  organizationNumber: string;
  weightKg: number | null;
  confidence: number;
  evidence: Record<string, string>;
};

const serviceTypes = ['Kranbil', 'Budbil', 'Tippbil', 'Krokbil', 'TMA-skydd', 'Byggsäck', 'Maskintransport'];

const labels: Record<string, keyof ParsedInboundOrder> = {
  uppdrag: 'title', order: 'title', rubrik: 'title', subject: 'title',
  kund: 'customerName', customer: 'customerName', beställare: 'customerName', bestallare: 'customerName',
  hämtning: 'pickupAddress', hamtning: 'pickupAddress', pickup: 'pickupAddress', från: 'pickupAddress', fran: 'pickupAddress',
  leverans: 'deliveryAddress', delivery: 'deliveryAddress', till: 'deliveryAddress', lossning: 'deliveryAddress',
  datum: 'scheduledStart', date: 'scheduledStart', tid: 'scheduledStart', start: 'scheduledStart',
  kontakt: 'contactName', contact: 'contactName', kontaktperson: 'contactName',
  telefon: 'contactPhone', phone: 'contactPhone', tel: 'contactPhone', mobil: 'contactPhone',
  referens: 'orderReference', ordernummer: 'orderReference', ordernr: 'orderReference', bokningsnummer: 'orderReference',
  organisationsnummer: 'organizationNumber', orgnr: 'organizationNumber', orgnummer: 'organizationNumber',
  instruktion: 'instructions', instruktioner: 'instructions', gods: 'instructions', beskrivning: 'instructions',
  tjänst: 'serviceType', tjanst: 'serviceType', fordonstyp: 'serviceType', service: 'serviceType',
};

function clean(value: string) {
  return value.replace(/[\u0000-\u001f]+/g, ' ').replace(/^[-–—•\s]+/, '').replace(/\s+/g, ' ').trim();
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function labelledValues(text: string) {
  const values: Partial<Record<keyof ParsedInboundOrder, string>> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([^:]{2,35})\s*:\s*(.+)$/);
    if (!match) continue;
    const key = labels[match[1].trim().toLowerCase()];
    if (!key) continue;
    const value = clean(match[2]);
    if (!value) continue;
    if (key === 'instructions' && values.instructions) values.instructions += `\n${value}`;
    else values[key] = value;
  }
  return values;
}

function parseDateTime(value: string) {
  const normalized = value.replace(/\s+kl\.?\s*/gi, ' ').replace(/\./g, '-');
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
  const swedishMonths: Record<string, string> = { januari: '01', februari: '02', mars: '03', april: '04', maj: '05', juni: '06', juli: '07', augusti: '08', september: '09', oktober: '10', november: '11', december: '12' };
  const written = normalized.toLowerCase().match(/(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)(?:\s+(20\d{2}))?(?:\s+(\d{1,2})[:.]?(\d{2})?)?/);
  if (!written) return '';
  const [, day, monthName, year = String(new Date().getFullYear()), hour = '08', minute = '00'] = written;
  return `${year}-${swedishMonths[monthName]}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function addresses(text: string) {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const route = lines.find(line => /\s(?:→|->|till)\s/i.test(line));
  if (route) {
    const parts = route.split(/\s(?:→|->|till)\s/i).map(clean).filter(Boolean);
    if (parts.length >= 2) return { pickup: parts[0], delivery: parts.slice(1).join(' ') };
  }
  const candidates = lines
    .filter(line => /\b\d{1,4}[A-Za-z]?\b/.test(line) && /[A-Za-zÅÄÖåäö]{3,}/.test(line))
    .filter(line => !/telefon|mobil|org|order|referens|datum|tid|kg|ton/i.test(line))
    .slice(0, 2);
  return { pickup: candidates[0] ?? '', delivery: candidates[1] ?? '' };
}

function extractWeight(text: string) {
  const kg = text.match(/(?:vikt\s*[:]?\s*)?(\d+(?:[,.]\d+)?)\s*kg\b/i);
  if (kg) return Math.round(Number(kg[1].replace(',', '.')));
  const tonnes = text.match(/(?:vikt\s*[:]?\s*)?(\d+(?:[,.]\d+)?)\s*(?:ton|tonn|t)\b/i);
  return tonnes ? Math.round(Number(tonnes[1].replace(',', '.')) * 1000) : null;
}

export function parseInboundOrder(input: string, subject = ''): ParsedInboundOrder {
  const text = clean(`${subject}\n${input}`.replace(/\r?\n/g, '\n')).replace(/\s{2,}/g, ' ');
  const multiline = `${subject}\n${input}`.replace(/\r/g, '');
  const values = labelledValues(multiline);
  const inferred = addresses(multiline);
  const phone = multiline.match(/(?:\+46|0)[\d\s-]{7,14}/)?.[0]?.trim() ?? '';
  const org = multiline.match(/\b(?:16)?\d{6}[- ]?\d{4}\b/)?.[0]?.replace(/\s/g, '') ?? '';
  const reference = multiline.match(/(?:ordernr|ordernummer|referens|bokningsnummer)\s*[:#]?\s*([A-ZÅÄÖ0-9-]{3,30})/i)?.[1] ?? '';
  const serviceType = values.serviceType || serviceTypes.find(type => text.toLowerCase().includes(type.toLowerCase())) || '';
  const scheduledStart = parseDateTime(values.scheduledStart || multiline);
  const title = values.title || subject.trim() || multiline.split(/\n/).map(clean).find(line => line.length > 4 && !line.includes(':'))?.slice(0, 140) || 'Transportuppdrag';
  const result: ParsedInboundOrder = {
    title,
    customerName: values.customerName || '',
    pickupAddress: values.pickupAddress || inferred.pickup,
    deliveryAddress: values.deliveryAddress || inferred.delivery,
    scheduledStart,
    instructions: values.instructions || input.trim().slice(0, 8000),
    serviceType,
    contactName: values.contactName || '',
    contactPhone: values.contactPhone || phone,
    orderReference: values.orderReference || reference,
    organizationNumber: values.organizationNumber || org,
    weightKg: extractWeight(multiline),
    confidence: 0,
    evidence: {},
  };
  const important = ['title', 'customerName', 'pickupAddress', 'deliveryAddress', 'scheduledStart'] as const;
  result.confidence = Math.round((important.filter(key => Boolean(result[key])).length / important.length) * 100);
  for (const key of important) if (result[key]) result.evidence[key] = String(result[key]);
  return result;
}
