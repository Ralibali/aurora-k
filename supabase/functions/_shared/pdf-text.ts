import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from 'npm:buffer@6.0.3';

export async function extractPdfText(bytes: Uint8Array) {
  const result = await pdf(Buffer.from(bytes));
  const text = Array.from(String(result.text ?? ''), character => character.charCodeAt(0) === 0 ? '' : character).join('').trim();
  return {
    text,
    pages: Number(result.numpages ?? 0),
    metadata: result.info ?? null,
  };
}
