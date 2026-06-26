import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from 'npm:buffer@6.0.3';

export async function extractPdfText(bytes: Uint8Array) {
  const result = await pdf(Buffer.from(bytes));
  return {
    text: String(result.text ?? '').replace(/\u0000/g, '').trim(),
    pages: Number(result.numpages ?? 0),
    metadata: result.info ?? null,
  };
}
