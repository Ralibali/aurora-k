import { Webhook } from 'npm:svix@1.68.0';

export type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  subject?: string;
  text?: string | null;
  html?: string | null;
  message_id?: string | null;
};

export type ReceivedAttachment = {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  download_url: string;
};

export function verifyResendWebhook(rawBody: string, headers: Headers, secret: string) {
  return new Webhook(secret).verify(rawBody, {
    'svix-id': headers.get('svix-id') ?? '',
    'svix-timestamp': headers.get('svix-timestamp') ?? '',
    'svix-signature': headers.get('svix-signature') ?? '',
  }) as { type?: string; data?: { email_id?: string; to?: string[] } };
}

async function resendGet(path: string, apiKey: string) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Resend API ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function getReceivedEmail(emailId: string, apiKey: string) {
  return resendGet(`/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, apiKey) as Promise<ReceivedEmail>;
}

export async function listReceivedAttachments(emailId: string, apiKey: string) {
  const result = await resendGet(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`, apiKey) as { data?: ReceivedAttachment[] };
  return result.data ?? [];
}

export function extractOrderInboxKey(addresses: string[]) {
  for (const address of addresses) {
    const local = address.toLowerCase().split('@')[0] ?? '';
    const match = local.match(/order[+-]([0-9a-f]{8}-[0-9a-f-]{27})/i);
    if (match) return match[1];
  }
  return null;
}
