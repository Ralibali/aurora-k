// Aurora Transport har ännu inga betalande kunder. Produktbeskrivningar och
// åkeriets egna kunder är tillåtna; kundbevis om vår produkt är det inte.
export function normalizeCopy(value) {
  return value
    .replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,
      (_, wide, unicode, hex) => String.fromCodePoint(parseInt(wide || unicode || hex, 16)))
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&aring;/gi, 'å').replace(/&auml;/gi, 'ä').replace(/&ouml;/gi, 'ö')
    .replace(/&(?:nbsp|quot|ldquo|rdquo);/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFKC').replace(/\s+/g, ' ').trim();
}

const forbiddenOutput = [/\bcj\s+bemanning\b/i, /vad våra kunder säger/i];
export function outputClaim(value) {
  const text = normalizeCopy(value);
  return forbiddenOutput.find(pattern => pattern.test(text))?.source;
}

const editorialClaims = [
  ...forbiddenOutput,
  /\b(våra|vår|en av våra)\s+(kunder?|användare|kundföretag)\b/i,
  /\b(nöjda kunder|kundröster|kundcitat|kundcase|kundberättelser|customer voices|testimonials?)\b/i,
  /\b(?:de flesta|många|flera|hundratals|tusentals|\d[\d\s+.,]*)\s+(?:nöjda\s+)?kunder\b/i,
  /\b(?:allt fler|många|flera)\s+väljer\s+Aurora Transport\b/i,
  /\b(?:används av|used by|trusted by)\b/i,
  /\b(?:kör|använder|använt|valt|bytt till|uses?|using)\s+(?:redan\s+)?Aurora Transport\b/i,
  /Aurora Transport[^.!?]{0,100}(?:har hjälpt|hjälpte|sparade|sparat|minskade|ökade|betyg|stjärnor|rating)/i,
  /\b(?:kunderna|kunder)\s+(?:är igång|sparar|har sparat|berättar|säger|tycker|ger oss)\b/i,
  /\b(?:our customers?|happy customers?)\b/i,
  /\b(?:aggregateRating|ratingValue|reviewCount|reviewRating)\b/i,
  /["'](?:review|reviews)["']\s*:/i,
  /(?:[”"“][^”"“]{8,}[”"“]\s*[,–—-]?\s*(?:säger|berättar|enligt|says)|(?:säger|berättar)\s+[^.!?]{0,80}[”"“])/i,
];

export function editorialClaim(value) {
  // Citatblock tillåts inte i artikelflödet: det finns inga kundcitat att publicera.
  if (/<blockquote\b|^[ \t]*>[ \t]+\S/im.test(value)) return 'citatblock';
  const text = normalizeCopy(value);
  return editorialClaims.find(pattern => pattern.test(text))?.source;
}
