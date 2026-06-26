import { extractPdfText } from './pdf-text.ts';

function safeName(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 160) || 'attachment';
}

export async function processOrderAttachments(supabase: any, companyId: string, emailRowId: string, attachments: any[]) {
  const rows: any[] = [];
  const texts: string[] = [];

  for (const attachment of attachments) {
    const row: any = {
      provider_attachment_id: attachment.id,
      filename: attachment.filename,
      content_type: attachment.content_type,
      size: attachment.size,
    };
    try {
      if (attachment.size > 20 * 1024 * 1024) throw new Error('Bilagan är större än 20 MB');
      const response = await fetch(attachment.download_url);
      if (!response.ok) throw new Error(`Bilagan kunde inte hämtas (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const filename = safeName(attachment.filename);
      const path = `${companyId}/${emailRowId}/${attachment.id}-${filename}`;
      const { error } = await supabase.storage.from('order-inbox').upload(path, bytes, {
        contentType: attachment.content_type || 'application/octet-stream',
      });
      if (error) throw error;
      row.storage_path = path;

      if (attachment.content_type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
        const pdf = await extractPdfText(bytes);
        row.pages = pdf.pages;
        row.extracted_characters = pdf.text.length;
        row.text_preview = pdf.text.slice(0, 500);
        if (pdf.text) texts.push(`PDF ${attachment.filename}:\n${pdf.text}`);
      } else if (attachment.content_type.startsWith('text/') || /\.(csv|txt)$/i.test(filename)) {
        const text = new TextDecoder().decode(bytes);
        row.extracted_characters = text.length;
        row.text_preview = text.slice(0, 500);
        texts.push(`${attachment.filename}:\n${text}`);
      }
    } catch (error) {
      row.error = error instanceof Error ? error.message : 'Bilagan kunde inte behandlas';
    }
    rows.push(row);
  }

  return { rows, texts };
}
