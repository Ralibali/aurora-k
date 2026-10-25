import { useState } from 'react';
import { ClipboardCheck, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { checkItems, answerLabels, validateCheck, type CheckInput, type CheckAnswer } from './vehicle-check';
import { useVehicleChecks, useChangeVehicleCheck } from './use-vehicle-checks';
import { VehicleCheckHistory } from './VehicleCheckHistory';

const initial: CheckInput = { tires: 'not_checked', lights: 'not_checked', damage: 'not_checked', safetyCritical: false, note: '' };
export function DriverVehicleCheck({ assignmentId, vehicleId, vehicleName, canReport }: { assignmentId: string; vehicleId: string | null; vehicleName?: string; canReport: boolean }) {
  const checks = useVehicleChecks();
  const change = useChangeVehicleCheck();
  const [answers, setAnswers] = useState<CheckInput>(initial);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const history = (checks.data ?? []).filter(check => check.vehicle_id === vehicleId);
  const submit = async () => {
    if (change.isPending) return;
    try {
      await change.mutateAsync({ type: 'report', assignmentId, operationId, answers });
      setOpen(false); setConfirm(false); setAnswers(initial); setError(''); setOperationId(crypto.randomUUID());
    } catch { /* Toast is provided by the mutation; preserve input and retry key. */ }
  };
  return <section aria-label="Fordonskontroll" className="space-y-4 border-y py-5">
    <h2 className="flex items-center gap-2 text-base font-semibold"><ClipboardCheck className="h-5 w-5" />Fordonskontroll</h2>
    <p className="text-sm text-muted-foreground">{vehicleName || 'Fordon ej kopplat'}</p>
    <p className="text-sm text-muted-foreground">Kontrollen är förarens observationer, inte ett intyg om trafiksäkerhet. Vid säkerhetskritisk avvikelse: kör inte vidare och kontakta arbetsledningen.</p>
    {canReport && vehicleId && <Button variant="outline" className="min-h-12 w-full" onClick={() => setOpen(value => !value)}><ClipboardCheck className="mr-2 h-4 w-4" />{open ? 'Stäng kontroll' : 'Kontrollera före körning'}</Button>}
    {canReport && !vehicleId && <p className="text-sm">Be admin koppla ett fordon till uppdraget.</p>}
    {open && canReport && vehicleId && <form className="space-y-4" onSubmit={event => {
      event.preventDefault(); const problem = validateCheck(answers); setError(problem ?? '');
      if (!problem) { if (answers.safetyCritical) setConfirm(true); else void submit(); }
    }}>
      {checkItems.map(item => <fieldset key={item.key} disabled={change.isPending} className="space-y-2"><legend className="font-medium text-sm">{item.label}</legend>
        <div className="grid gap-2">{(['no_issue', 'issue', 'not_checked'] as CheckAnswer[]).map(value => <label key={value} className="flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm">
          <input type="radio" name={item.key} value={value} checked={answers[item.key] === value} onChange={() => setAnswers(current => ({ ...current, [item.key]: value }))} />{answerLabels[value]}
        </label>)}</div>
      </fieldset>)}
      <div className="flex min-h-12 items-center gap-3"><Checkbox id="vehicle-critical" checked={answers.safetyCritical} disabled={change.isPending} onCheckedChange={value => setAnswers(current => ({ ...current, safetyCritical: value === true }))} /><Label htmlFor="vehicle-critical">Säkerhetskritisk avvikelse</Label></div>
      <div className="space-y-2"><Label htmlFor="vehicle-note">Beskriv avvikelsen</Label><Textarea id="vehicle-note" maxLength={3000} value={answers.note} disabled={change.isPending} onChange={event => setAnswers(current => ({ ...current, note: event.target.value }))} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={change.isPending} className="min-h-12 w-full"><Send className="mr-2 h-4 w-4" />{change.isPending ? 'Sparar…' : 'Spara fordonskontroll'}</Button>
    </form>}
    {checks.isLoading ? <p role="status">Hämtar kontroller…</p> : checks.isError ? <div role="alert"><p>Kontrollerna kunde inte hämtas.</p><Button variant="outline" onClick={() => void checks.refetch()}>Försök igen</Button></div> : history.length > 0 ? <div className="space-y-3"><h3 className="text-sm font-semibold">Mina kontroller för fordonet</h3>{history.map(check => <div key={check.id} className="border-t pt-3"><VehicleCheckHistory check={check} /></div>)}</div> : <p className="text-sm text-muted-foreground">Inga egna kontroller för fordonet.</p>}
    <Dialog open={confirm} onOpenChange={value => { if (!change.isPending) setConfirm(value); }}><DialogContent><DialogHeader><DialogTitle>Rapportera säkerhetskritisk avvikelse?</DialogTitle><DialogDescription>Kör inte vidare. Kontakta arbetsledningen direkt. Rapporten sparas till admin; ingen körning eller tidregistrering startas.</DialogDescription></DialogHeader><p className="whitespace-pre-wrap break-words text-sm">{answers.note}</p><Button disabled={change.isPending} onClick={() => void submit()}>Bekräfta rapport</Button><Button variant="outline" disabled={change.isPending} onClick={() => setConfirm(false)}>Tillbaka</Button></DialogContent></Dialog>
  </section>;
}