import { useState } from 'react';
import { Button } from '@/components/ui/button';

type QueueRow = { id: string; subject: string; status: string; received_at: string };

export function OrderQueuePanel() {
  const [rows] = useState<QueueRow[]>([]);
  return <div className="rounded-xl border p-4">
    <p className="font-semibold">Inkomna order</p>
    <p className="mt-1 text-sm text-muted-foreground">{rows.length} order i kön</p>
    <Button className="mt-3" variant="outline">Uppdatera</Button>
  </div>;
}
