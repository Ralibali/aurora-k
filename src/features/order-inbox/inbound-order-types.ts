export type OrderInboxChannel = {
  id: string;
  company_id: string;
  inbox_key: string;
  enabled: boolean;
};

export type InboundOrderEmail = {
  id: string;
  from_address: string;
  subject: string;
  status: string;
  parse_confidence: number;
  received_at: string;
  parsed_payload: Record<string, unknown> | null;
  attachments: Array<Record<string, unknown>>;
  error_message: string | null;
};
