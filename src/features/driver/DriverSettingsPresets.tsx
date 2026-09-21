import { useRef, useState } from 'react';
import { Check, Camera, Clock, Eye, PenLine, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateDriverSettings, type DriverSettings } from '@/hooks/useDriverSettings';

type Profile = Pick<DriverSettings, 'require_signature' | 'require_photo' | 'show_time_report' | 'show_availability_toggle' | 'show_total_hours'>;
const driverPresets: { id: string; name: string; description: string; values: Profile }[] = [
  { id: 'courier', name: 'Bud & distribution', description: 'Leveransbevis i fokus, med en avskalad förarvy.', values: { require_signature: true, require_photo: true, show_time_report: false, show_availability_toggle: true, show_total_hours: false } },
  { id: 'haulage', name: 'Åkeri', description: 'Leveransbevis och tidrapportering i samma arbetsflöde.', values: { require_signature: true, require_photo: true, show_time_report: true, show_availability_toggle: true, show_total_hours: true } },
  { id: 'staffing', name: 'Bemanning', description: 'Tidrapportering utan generellt krav på leveransfoto och signatur.', values: { require_signature: false, require_photo: false, show_time_report: true, show_availability_toggle: true, show_total_hours: true } },
];
export function DriverSettingsPresets({ settings }: { settings: DriverSettings }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const save = useUpdateDriverSettings();
  const preset = driverPresets.find(item => item.id === selected);
  const preview = preset?.values ?? settings;
  const unchanged = !preset || Object.entries(preset.values).every(([key, value]) => settings[key as keyof Profile] === value);
  const apply = async () => {
    if (!preset || lock.current || unchanged) return;
    lock.current = true; setError('');
    try { await save.mutateAsync({ id: settings.id, ...preset.values }); setSelected(null); }
    catch { setError('Mallen kunde inte sparas. Ditt val finns kvar så att du kan försöka igen.'); }
    finally { lock.current = false; }
  };
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Smartphone className="h-4 w-4" />Börja med ert arbetssätt</CardTitle><CardDescription>Välj en mall, granska förhandsvisningen och spara. Du kan finjustera varje inställning nedan.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">{driverPresets.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} disabled={save.isPending} onClick={() => { setSelected(item.id); setError(''); }} className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === item.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}><span className="text-sm font-semibold">{item.name}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.description}</span></button>)}</div>
      <div className="rounded-xl border bg-muted/30 p-4" aria-label="Förhandsvisning av förarinställningar">
        <p className="flex items-center gap-2 text-sm font-medium"><Eye className="h-4 w-4" />{preset ? `Förhandsvisning: ${preset.name}` : 'Nuvarande förarinställningar'}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md border bg-background px-2 py-1">Mina uppdrag</span><span className="rounded-md border bg-background px-2 py-1">Profil</span>{preview.show_time_report && <span className="rounded-md border bg-background px-2 py-1">Tidrapport{preview.show_total_hours ? ' med totalsumma' : ''}</span>}{preview.show_availability_toggle && <span className="rounded-md border bg-background px-2 py-1">Markera tillgänglighet</span>}</div>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground"><p className="flex items-center gap-2"><PenLine className="h-3 w-3" />Signatur: {preview.require_signature ? 'krävs' : 'valfri som standard'}</p><p className="flex items-center gap-2"><Camera className="h-3 w-3" />Leveransfoto: {preview.require_photo ? 'krävs' : 'valfritt som standard'}</p><p className="flex items-center gap-2"><Clock className="h-3 w-3" />Tidrapport: {preview.show_time_report ? 'visas' : 'döljs i navigationen'}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">Mallen ändrar förarvyn och förval för nya manuella uppdrag. Individuella undantag gäller fortfarande. Befintliga uppdrag behåller sina sparade leveranskrav.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={!preset || unchanged || save.isPending} onClick={() => void apply()}><Check className="mr-2 h-4 w-4" />{save.isPending ? 'Sparar…' : preset && unchanged ? 'Mallen stämmer med era inställningar' : 'Använd vald mall'}</Button>
    </CardContent>
  </Card>;
}
