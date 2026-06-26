import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type QueueRow = {
  id: string;
  from_address: string;
  subject: string;
  status: string;
  parse_confidence: number;
  received_at: string;
};

export function OrderQueuePanel() {
  const [rows, setRows] = useState<QueueRow[]>([]);

  const load = async () => {
    const { data } = await supabase.functions.invoke('order-inbox-api', { body: { action: 'overview' } });
    setRows((data as { queue?: QueueRow[] } | null)?.queue ?? []);
  };

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 20_000); return () => window.clearInterval(timer); }, []);

  return <div className="rounded-xl border p-4">
    <div className="flex items-center justify-between"><div><p className="font-semibold">Inkomna order</p><p className="text-sm text-muted-foreground">{rows.length} order i kön</p></div><Button size="sm" variant="outline" onClick={() => void load()}>Uppdatera</Button></div>
    <div className="mt-4 space-y-2">{rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Kön är tom.</p> : rows.map(row => <div key={row.id} className="rounded-lg border p-3"><p className="font-medium">{row.subject || 'Order utan ämne'}</p><p className="text-xs text-muted-foreground">{row.from_address} · {new Date(row.received_at).toLocaleString('sv-SE')}</p><div className="mt-2 flex gap-2"><Badge>{row.status}</Badge><Badge variant="outline">{row.parse_confidence}%</Badge></div></div>)}</div>
  </div>;
}
