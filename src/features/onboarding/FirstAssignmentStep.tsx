import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type FirstAssignmentDraft = {
  customerName: string;
  title: string;
  scheduledStart: string;
  pickupAddress: string;
  deliveryAddress: string;
  driverId: string;
};

export function FirstAssignmentStep({ draft, drivers, submitting, onChange, onSubmit, onSkip }: {
  draft: FirstAssignmentDraft;
  drivers: Array<{ id: string; full_name: string }>;
  submitting: boolean;
  onChange: (field: keyof FirstAssignmentDraft, value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const ready = Boolean(draft.customerName.trim() && draft.title.trim() && draft.scheduledStart && draft.driverId);

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-semibold">Skapa första uppdraget</h2><p className="mt-1 text-sm text-muted-foreground">Uppdraget måste tilldelas en riktig chaufför. Administratören används aldrig som reserv.</p></div>
      <div className="space-y-2"><Label>Kund</Label><Input value={draft.customerName} onChange={event => onChange('customerName', event.target.value)} placeholder="Kund AB" /></div>
      <div className="space-y-2"><Label>Uppdrag</Label><Input value={draft.title} onChange={event => onChange('title', event.target.value)} placeholder="Leverans till kund" /></div>
      <div className="space-y-2"><Label>Planerad start</Label><Input type="datetime-local" value={draft.scheduledStart} onChange={event => onChange('scheduledStart', event.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Hämtadress</Label><Input value={draft.pickupAddress} onChange={event => onChange('pickupAddress', event.target.value)} /></div><div className="space-y-2"><Label>Leveransadress</Label><Input value={draft.deliveryAddress} onChange={event => onChange('deliveryAddress', event.target.value)} /></div></div>
      <div className="space-y-2"><Label>Chaufför</Label><Select value={draft.driverId} onValueChange={value => onChange('driverId', value)}><SelectTrigger><SelectValue placeholder={drivers.length ? 'Välj chaufför' : 'Inga chaufförer registrerade'} /></SelectTrigger><SelectContent>{drivers.map(driver => <SelectItem key={driver.id} value={driver.id}>{driver.full_name}</SelectItem>)}</SelectContent></Select>{drivers.length === 0 && <p className="text-xs text-amber-700">Slutför utan uppdrag och skapa det när en chaufför har accepterat sin inbjudan.</p>}</div>
      <div className="space-y-2"><Button className="h-12 w-full" disabled={submitting || !ready} onClick={onSubmit}>{submitting ? 'Skapar…' : 'Skapa uppdrag och slutför'}</Button><Button type="button" variant="ghost" className="w-full" disabled={submitting} onClick={onSkip}>Slutför utan uppdrag</Button></div>
    </div>
  );
}
