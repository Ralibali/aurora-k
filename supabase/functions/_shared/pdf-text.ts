import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from 'npm:buffer@6.0.3';
import { azureOcrConfigured, extractTextWithAzureOcr } from './azure-document-ocr.ts';

export async function extractPdfText(bytes: Uint8Array) {
  const result = await pdf(Buffer.from(bytes));
  const embeddedText = Array.from(String(result.text ?? ''), character => character.charCodeAt(0) === 0 ? '' : character).join('').trim();
  const pages = Number(result.numpages ?? 0);

  if (embeddedText.length >= 30 || !azureOcrConfigured()) {
    return {
      text: embeddedText,
      pages,
      metadata: result.info ?? null,
      extractionMethod: 'embedded-text' as const,
      ocrAvailable: azureOcrConfigured(),
    };
  }

  const ocr = await extractTextWithAzureOcr(bytes);
  return {
    text: ocr.text,
    pages: ocr.pages || pages,
    metadata: result.info ?? null,
    extractionMethod: 'azure-ocr' as const,
    ocrAvailable: true,
  };
}
