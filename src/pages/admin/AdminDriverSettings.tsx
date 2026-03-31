import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDriverSettings, useUpdateDriverSettings } from '@/hooks/useDriverSettings';
import { Smartphone, PenLine, Camera, Clock, CircleDot } from 'lucide-react';

const settingsConfig = [
  {
    key: 'require_signature' as const,
    label: 'Kräv signatur vid slutförande',
    description: 'Föraren måste samla in mottagarens signatur innan uppdraget kan slutföras',
    icon: PenLine,
  },
  {
    key: 'require_photo' as const,
    label: 'Kräv fraktsedelfoto',
    description: 'Föraren uppmanas att ta foto på fraktsedeln vid slutförande',
    icon: Camera,
  },
  {
    key: 'show_time_report' as const,
    label: 'Visa tidrapporter',
    description: 'Föraren kan se sin tidrapportssida med vecko- och månadsöversikt',
    icon: Clock,
  },
  {
    key: 'show_availability_toggle' as const,
    label: 'Visa tillgänglighets-toggle',
    description: 'Föraren kan markera sig som ledig eller upptagen i sin profil',
    icon: CircleDot,
  },
];

export default function AdminDriverSettings() {
  const { data: settings, isLoading } = useDriverSettings();
  const updateSettings = useUpdateDriverSettings();

  const handleToggle = (key: keyof typeof settings & string, value: boolean) => {
    if (!settings) return;
    updateSettings.mutate({ id: settings.id, [key]: value });
  };

  return (
    <AdminLayout title="Förarinställningar" description="Anpassa förarens app">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Förarinställningar</h1>
          <p className="text-muted-foreground mt-1">Anpassa vad förarna ser och kan göra i sin app</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              Förarens funktioner
            </CardTitle>
            <CardDescription>
              Slå av funktioner som inte behövs. Ändringar gäller alla förare direkt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : (
              settingsConfig.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.[item.key] ?? true}
                    onCheckedChange={(v) => handleToggle(item.key, v)}
                    disabled={updateSettings.isPending}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
