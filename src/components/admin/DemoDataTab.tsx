import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Sparkles, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function DemoDataTab() {
  const { enabled, enable, disable } = useDemoMode();

  const handleChange = (next: boolean) => {
    if (next) {
      enable();
      toast.success('Exempeldata visas', { description: 'Visas endast där du inte har egen data. Inget sparas i databasen.' });
    } else {
      disable();
      toast.success('Exempeldata borttagen', { description: 'Du ser nu enbart din riktiga data.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exempeldata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Visa exempeldata</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fyller tomma vyer med realistiska exempel så att du kan utforska systemet.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleChange} aria-label="Visa exempeldata" />
        </div>

        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            Din egen data skrivs aldrig över. Exempeldata visas bara i vyer som är tomma och sparas
            aldrig i databasen — den ligger enbart lokalt i den här webbläsaren.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant={enabled ? 'destructive' : 'outline'}
            onClick={() => handleChange(false)}
            disabled={!enabled}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> Ta bort exempeldata
          </Button>
          {!enabled && (
            <Button variant="outline" onClick={() => handleChange(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Visa exempeldata
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
