import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type QueueRow = { id: string; subject: string; status: string; received_at: string };

export function OrderQueuePanel() {
  const [rows, setRows] = useState<QueueRow[]>([]);

  const load = async () => {
    const { data } = await supabase.functions.invoke('order-inbox-api', { body: { action: 'overview' } });
    setRows((data as { queue?: QueueRow[] } | null)?.queue ?? []);
  };

  useEffect(() => { void load(); }, []);

  return <div className="rounded-xl border p-4">
    <p className="font-semibold">Inkomna order</p>
    <p className="mt-1 text-sm text-muted-foreground">{rows.length} order i kön</p>
    <Button className="mt-3" variant="outline" onClick={() => void load()}>Uppdatera</Button>
  </div>;
}
