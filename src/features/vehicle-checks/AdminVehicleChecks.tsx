import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useVehicleChecks, useChangeVehicleCheck } from './use-vehicle-checks';
import { VehicleCheckHistory } from './VehicleCheckHistory';
import type { VehicleCheck } from './vehicle-check';

export function AdminVehicleChecks({ vehicles }: { vehicles: { id: string; name: string; registration_number: string | null }[] }) {
  const checks = useVehicleChecks();
  const change = useChangeVehicleCheck();
  const [vehicle, setVehicle] = useState('all');
  const [status, setStatus] = useState('open');
  const [selected, setSelected] = useState<VehicleCheck | null>(null);
  const [resolution, setResolution] = useState('');
  const [confirm, setConfirm] = useState(false);
  const rows = (checks.data ?? []).filter(row => (vehicle === 'all' || row.vehicle_id === vehicle) && (status === 'all' || row.status === status));
  const resolve = async () => {
    if (!selected || change.isPending) return;
    try { await change.mutateAsync({ type: 'resolve', id: selected.id, resolution }); setSelected(null); setResolution(''); setConfirm(false); }
    catch { /* Preserve the resolution for retry. */ }
  };
  return <section className="space-y-4 border-t pt-6" aria-label="Fordonskontroller och avvikelser">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5" />Fordonskontroller och avvikelser</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label>Fordonshistorik</Label><Select value={vehicle} onValueChange={setVehicle}><SelectTrigger aria-label="Fordonshistorik"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alla fordon</SelectItem>{vehicles.map(item => <SelectItem key={item.id} value={item.id}>{item.name}{item.registration_number ? ` · ${item.registration_number}` : ''}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Kontrollstatus"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Öppna avvikelser</SelectItem><SelectItem value="all">Alla kontroller</SelectItem><SelectItem value="recorded">Registrerade kontroller</SelectItem><SelectItem value="resolved">Avslutade avvikelser</SelectItem></SelectContent></Select></div>
    </div>
    {checks.isLoading ? <p role="status">Hämtar kontroller…</p> : checks.isError ? <div role="alert"><p>Fordonskontrollerna kunde inte hämtas.</p><Button variant="outline" onClick={() => void checks.refetch()}>Försök igen</Button></div> : rows.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Inga kontroller med valda filter.</p> : rows.map(row => {
      const item = vehicles.find(v => v.id === row.vehicle_id);
      return <article key={row.id} className="space-y-3 border-t py-4">
        <h3 className="font-semibold">{item ? [item.name, item.registration_number].filter(Boolean).join(' · ') : 'Fordon'} </h3>
        <VehicleCheckHistory check={row} />
        {row.status === 'open' && <Button variant="outline" onClick={() => { setSelected(row); setResolution(''); setConfirm(false); }}>Registrera åtgärd</Button>}
      </article>;
    })}
    <Dialog open={!!selected} onOpenChange={value => { if (!value && !change.isPending) { setSelected(null); setConfirm(false); } }}><DialogContent><DialogHeader><DialogTitle>{confirm ? 'Avsluta avvikelsen?' : 'Registrera åtgärd'}</DialogTitle><DialogDescription>Åtgärdsnoteringen intygar inte att fordonet är trafiksäkert. Ursprunglig rapport finns kvar i historiken.</DialogDescription></DialogHeader>
      {selected && <VehicleCheckHistory check={selected} />}
      <Label htmlFor="vehicle-resolution">Utförd åtgärd</Label><Textarea id="vehicle-resolution" maxLength={3000} value={resolution} disabled={change.isPending || confirm} onChange={event => setResolution(event.target.value)} />
      <Button disabled={!resolution.trim() || change.isPending} onClick={() => { if (confirm) void resolve(); else setConfirm(true); }}>{change.isPending ? 'Sparar…' : confirm ? 'Bekräfta och avsluta' : 'Granska åtgärd'}</Button>
      {confirm && <Button variant="outline" disabled={change.isPending} onClick={() => setConfirm(false)}>Tillbaka</Button>}
    </DialogContent></Dialog>
  </section>;
}