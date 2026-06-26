function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 32_768;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

type AnalyzeResult = {
  status?: string;
  analyzeResult?: {
    content?: string;
    pages?: Array<Record<string, unknown>>;
    paragraphs?: Array<{ content?: string }>;
  };
  error?: { message?: string };
};

export function azureOcrConfigured() {
  return Boolean(Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT') && Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY'));
}

export async function extractTextWithAzureOcr(bytes: Uint8Array, locale = 'sv-SE') {
  const endpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')?.replace(/\/$/, '');
  const key = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
  if (!endpoint || !key) throw new Error('Azure Document Intelligence är inte konfigurerat');

  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?_overload=analyzeDocument&api-version=2024-11-30&locale=${encodeURIComponent(locale)}&features=ocrHighResolution`;
  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Source: bytesToBase64(bytes) }),
  });
  if (response.status !== 202) throw new Error(`OCR-start misslyckades (${response.status}): ${await response.text()}`);
  const operationLocation = response.headers.get('operation-location');
  if (!operationLocation) throw new Error('OCR-tjänsten returnerade ingen operation-location');

  for (let attempt = 0; attempt < 45; attempt += 1) {
    const retryAfter = Number(response.headers.get('retry-after') ?? 1);
    await sleep(Math.max(750, Math.min(3000, retryAfter * 1000)));
    const poll = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': key, Accept: 'application/json' },
    });
    const result = await poll.json().catch(() => ({})) as AnalyzeResult;
    if (!poll.ok) throw new Error(`OCR-status misslyckades (${poll.status}): ${JSON.stringify(result)}`);
    if (result.status === 'failed') throw new Error(result.error?.message || 'OCR-analysen misslyckades');
    if (result.status === 'succeeded') {
      const directContent = result.analyzeResult?.content?.trim();
      const paragraphContent = result.analyzeResult?.paragraphs?.map(paragraph => paragraph.content?.trim()).filter(Boolean).join('\n');
      const text = directContent || paragraphContent || '';
      return { text, pages: result.analyzeResult?.pages?.length ?? 0, provider: 'azure-document-intelligence' as const };
    }
  }

  throw new Error('OCR-analysen tog för lång tid');
}
