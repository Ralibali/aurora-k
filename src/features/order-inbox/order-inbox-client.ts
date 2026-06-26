import { createClient } from '@supabase/supabase-js';

export type OrderInboxChannel = {
  id: string;
  company_id: string;
  inbox_key: string;
  enabled: boolean;
};

export type InboundOrderEmail = {
  id: string;
  company_id: string;
  from_address: string;
  subject: string;
  status: string;
  parse_confidence: number;
  received_at: string;
  parsed_payload: Record<string, unknown> | null;
  attachments: Array<Record<string, unknown>>;
  error_message: string | null;
};

type InboxDatabase = {
  public: {
    Tables: {
      order_inbox_channels: {
        Row: OrderInboxChannel;
        Insert: { company_id: string; enabled?: boolean };
        Update: Partial<OrderInboxChannel>;
        Relationships: [];
      };
      inbound_order_emails: {
        Row: InboundOrderEmail;
        Insert: never;
        Update: Partial<InboundOrderEmail> & { reviewed_at?: string | null; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const orderInboxClient = createClient<InboxDatabase>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { storage: localStorage, persistSession: true, autoRefreshToken: false } },
);
