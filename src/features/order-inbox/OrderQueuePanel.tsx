import { Button } from '@/components/ui/button';

export function OrderQueuePanel() {
  return <div className="rounded-xl border p-4">
    <p className="font-semibold">Inkomna order</p>
    <p className="mt-1 text-sm text-muted-foreground">Kön uppdateras automatiskt.</p>
    <Button className="mt-3" variant="outline">Uppdatera</Button>
  </div>;
}
