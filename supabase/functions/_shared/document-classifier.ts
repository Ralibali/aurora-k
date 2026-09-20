export type TransportDocumentType = 'transport_order' | 'pod' | 'cmr' | 'unknown';

const rules: Array<{ type: Exclude<TransportDocumentType, 'unknown'>; patterns: RegExp[] }> = [
  {
    type: 'cmr',
    patterns: [
      /\bcmr\b/i,
      /fraktsedel/i,
      /frakthandling/i,
      /consignment\s+note/i,
      /\bavsändare\b[\s\S]{0,400}\bmottagare\b/i,
    ],
  },
  {
    type: 'pod',
    patterns: [
      /leveransbevis/i,
      /mottagningsbevis/i,
      /följesedel/i,
      /foljesedel/i,
      /proof\s+of\s+delivery/i,
      /\bpod\b/i,
      /kvitterad|kvittens|mottaget\s+av|godset\s+mottaget/i,
    ],
  },
  {
    type: 'transport_order',
    patterns: [
      /transportorder/i,
      /körorder/i,
      /kororder/i,
      /transportuppdrag/i,
      /bokningsbekräftelse/i,
      /\btransport\s*order\b/i,
      /hämtning[\s\S]{0,400}leverans/i,
    ],
  },
];

export function classifyTransportDocument(text: string): { documentType: TransportDocumentType; typeConfidence: number } {
  const haystack = text ?? '';
  if (!haystack.trim()) return { documentType: 'unknown', typeConfidence: 0 };

  let best: { type: TransportDocumentType; hits: number } = { type: 'unknown', hits: 0 };
  for (const rule of rules) {
    const hits = rule.patterns.filter(pattern => pattern.test(haystack)).length;
    if (hits > best.hits) best = { type: rule.type, hits };
  }
  if (!best.hits) return { documentType: 'unknown', typeConfidence: 0 };
  return { documentType: best.type, typeConfidence: Math.min(100, 55 + best.hits * 15) };
}

export function detectSignature(text: string) {
  return /signatur|underskrift|signed\s+by|kvitterad|mottaget\s+av|namnteckning|signature/i.test(text ?? '');
}

export function extractAmount(text: string): { amount: number | null; currency: string } {
  const source = text ?? '';
  const labelled = source.match(
    /(?:belopp|summa|totalt|total|att\s+betala|pris)\s*[:#]?\s*(?:(SEK|kr|EUR|€)\s*)?(\d{1,3}(?:[\s.]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(SEK|kr|EUR|€)?/i,
  );
  const trailing = labelled ? null : source.match(/(\d{1,3}(?:[\s.]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(SEK|kr)\b/i);
  const match = labelled ?? trailing;
  if (!match) return { amount: null, currency: '' };

  const raw = labelled ? labelled[2] : match[1];
  const currencyToken = (labelled ? labelled[1] || labelled[3] : match[2]) ?? '';
  const normalized = raw.replace(/[\s]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return { amount: null, currency: '' };
  const currency = /eur|€/i.test(currencyToken) ? 'EUR' : currencyToken ? 'SEK' : '';
  return { amount, currency };
}
