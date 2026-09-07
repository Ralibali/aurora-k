import { useState } from 'react';
import { AlertTriangle, Check, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStockholmTime, getDriverConflicts, getStockholmDateKey, isAssignableAssignment, isOpenAssignment, type DispatchAssignment } from './dispatch-utils';

export type DispatchDriver = { id: string; full_name: string; is_available?: boolean | null };

type Props = {
  assignments: DispatchAssignment[];
  selectedIds: string[];
  drivers: DispatchDriver[];
  initialDriverId?: string;
  demo: boolean;
  onClose: () => void;
  onAssign: (driverId: string, ids: string[]) => Promise<void>;
};

export function AssignDriverDialog({ assignments, selectedIds, drivers, initialDriverId = '', demo, onClose, onAssign }: Props) {
  const [driverId, setDriverId] = useState(initialDriverId);
  const [acceptedWarnings, setAcceptedWarnings] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selected = assignments.filter(item => selectedIds.includes(item.id));
  const driver = drivers.find(item => item.id === driverId);
  const conflicts = getDriverConflicts(assignments, selectedIds, driverId);
  const incompleteSchedule = selected.some(item => !item.scheduled_end)
    || assignments.some(item => item.assigned_driver_id === driverId && isOpenAssignment(item) && !item.scheduled_end);
  const needsAcknowledgement = driver?.is_available === false || conflicts.length > 0;
  const warningKey = JSON.stringify([driverId, driver?.is_available, conflicts.map(item => [item.assignment.id, item.assignment.scheduled_start, item.assignment.scheduled_end, item.conflictsWith.map(other => [other.id, other.scheduled_start, other.scheduled_end])])]);
  const dates = new Set(selected.map(item => getStockholmDateKey(item.scheduled_start)));
  const plannedCount = assignments.filter(item => item.assigned_driver_id === driverId && isOpenAssignment(item) && dates.has(getStockholmDateKey(item.scheduled_start)) && !selectedIds.includes(item.id)).length;
  const validSelection = selected.length === selectedIds.length && selected.length > 0 && selected.every(isAssignableAssignment);

  async function submit() {
    if (!driver || !validSelection || saving || (needsAcknowledgement && acceptedWarnings !== warningKey)) return;
    setSaving(true);
    setError('');
    try {
      await onAssign(driver.id, [...selectedIds]);
      onClose();
    } catch {
      setError('Tilldelningen kunde inte bekräftas för alla uppdrag. Några uppdrag kan ha blivit tilldelade. Kontrollera det uppdaterade urvalet innan du försöker igen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
          <DialogTitle>Tilldela chaufför</DialogTitle>
          <DialogDescription>Granska {selected.length} valda uppdrag och välj vem som ska köra.{demo ? ' Du provar med exempeldata.' : ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-44 divide-y overflow-y-auto rounded-lg border bg-muted/30">
          {selected.map(item => <div key={item.id} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.driver?.full_name ? `Nu: ${item.driver.full_name}` : 'Saknar chaufför'}</p></div><div className="shrink-0 text-right font-mono text-xs"><p>{getStockholmDateKey(item.scheduled_start)}</p><p className="mt-1 text-muted-foreground">{formatStockholmTime(item.scheduled_start)}{item.scheduled_end ? `–${formatStockholmTime(item.scheduled_end)}` : ' · sluttid saknas'}</p></div></div>)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-driver">Chaufför</Label>
          <Select value={driverId} onValueChange={value => { setDriverId(value); setAcceptedWarnings(''); setError(''); }} disabled={saving}>
            <SelectTrigger id="dispatch-driver"><SelectValue placeholder="Välj chaufför" /></SelectTrigger>
            <SelectContent>{drivers.map(item => <SelectItem key={item.id} value={item.id}>{item.full_name}{item.is_available === false ? ' · Ej tillgänglig' : item.is_available ? ' · Tillgänglig' : ''}</SelectItem>)}</SelectContent>
          </Select>
          {drivers.length === 0 && <p className="text-sm text-muted-foreground">Inga chaufförer finns att välja. Lägg till en chaufför under Förare.</p>}
          {driver && <p className="text-xs text-muted-foreground">{plannedCount} andra öppna uppdrag på de valda datumen.</p>}
        </div>
        {driver && <div className="space-y-3">
          {needsAcknowledgement ? <Alert className="border-warning/40 bg-warning/5"><AlertTriangle className="h-4 w-4" /><AlertTitle>Kontrollera planeringen</AlertTitle><AlertDescription>
            {driver.is_available === false && <p>{driver.full_name} är markerad som ej tillgänglig.</p>}
            {conflicts.length > 0 && <ul className="mt-2 space-y-1">{conflicts.map(item => <li key={item.assignment.id}>{item.assignment.title} överlappar {item.conflictsWith.map(other => other.title).join(', ')}.</li>)}</ul>}
          </AlertDescription></Alert> : <p className="flex items-center gap-2 text-sm text-success"><Check className="h-4 w-4" /> Inga kända tidsöverlapp</p>}
          {incompleteSchedule && <p className="text-xs text-muted-foreground">Sluttid saknas för vissa uppdrag. Alla tidsöverlapp kan därför inte kontrolleras.</p>}
          {needsAcknowledgement && <div className="flex items-start gap-2"><Checkbox id="dispatch-confirm-conflict" checked={acceptedWarnings === warningKey} onCheckedChange={checked => setAcceptedWarnings(checked === true ? warningKey : '')} disabled={saving} /><Label htmlFor="dispatch-confirm-conflict" className="text-sm font-normal leading-snug">Jag har kontrollerat planeringen och vill tilldela ändå.</Label></div>}
        </div>}
        {!validSelection && <Alert variant="destructive"><AlertDescription>Urvalet har ändrats. Stäng dialogen och välj uppdragen igen.</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Tillbaka</Button>
          <Button onClick={() => void submit()} disabled={!driver || !validSelection || saving || (needsAcknowledgement && acceptedWarnings !== warningKey)}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{saving ? 'Tilldelar…' : `${demo ? 'Prova att tilldela' : 'Tilldela'} ${selected.length} uppdrag`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
