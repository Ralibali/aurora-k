import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DriverInvite } from '@/features/onboarding/onboarding-service';

export function InviteStep({ invites, submitting, onChange, onAdd, onRemove, onSubmit, onSkip }: {
  invites: DriverInvite[];
  submitting: boolean;
  onChange: (index: number, field: keyof DriverInvite, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-semibold">Bjud in chaufförer</h2><p className="mt-1 text-sm text-muted-foreground">Du får korrekt återkoppling för varje e-post som faktiskt skickas.</p></div>
      <div className="space-y-3">{invites.map((invite, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input placeholder="Namn" value={invite.name} onChange={event => onChange(index, 'name', event.target.value)} /><Input type="email" placeholder="E-post" value={invite.email} onChange={event => onChange(index, 'email', event.target.value)} /><Button type="button" variant="ghost" size="icon" disabled={invites.length === 1} onClick={() => onRemove(index)} aria-label="Ta bort inbjudan"><Trash2 className="h-4 w-4" /></Button></div>)}</div>
      <Button type="button" variant="outline" size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" /> Lägg till chaufför</Button>
      <div className="space-y-2"><Button className="h-12 w-full" disabled={submitting} onClick={onSubmit}>{submitting ? 'Skickar…' : 'Skicka inbjudningar'}</Button><Button type="button" variant="ghost" className="w-full" disabled={submitting} onClick={onSkip}>Hoppa över</Button></div>
    </div>
  );
}
