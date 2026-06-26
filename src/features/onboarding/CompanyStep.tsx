import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CompanyStep({ name, orgNumber, email, submitting, onNameChange, onOrgNumberChange, onSubmit }: {
  name: string;
  orgNumber: string;
  email: string;
  submitting: boolean;
  onNameChange: (value: string) => void;
  onOrgNumberChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-semibold">Välkommen till Aurora Transport</h2><p className="mt-1 text-sm text-muted-foreground">Bekräfta företagsuppgifterna innan ni börjar arbeta.</p></div>
      <div className="space-y-2"><Label>Företagsnamn</Label><Input value={name} onChange={event => onNameChange(event.target.value)} /></div>
      <div className="space-y-2"><Label>Organisationsnummer</Label><Input value={orgNumber} onChange={event => onOrgNumberChange(event.target.value)} placeholder="556xxx-xxxx" /></div>
      <div className="space-y-2"><Label>Administratörens e-post</Label><Input value={email} readOnly className="bg-muted" /></div>
      <Button className="h-12 w-full" disabled={submitting || !name.trim()} onClick={onSubmit}>{submitting ? 'Sparar…' : 'Spara och fortsätt'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
    </div>
  );
}
