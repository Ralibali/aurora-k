import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useDriverSettings,
  useUpdateDriverSettings,
  useAllDriverSettingsOverrides,
  useUpsertDriverSettingsOverride,
  useDeleteDriverSettingsOverride,
  DriverSettingsOverride,
} from '@/hooks/useDriverSettings';
import { useDrivers } from '@/hooks/useData';
import { Smartphone, PenLine, Camera, Clock, CircleDot, Users, User, RotateCcw, Sparkles, ShieldCheck, LayoutDashboard } from 'lucide-react';

const settingsKeys = ['require_signature', 'require_photo', 'show_time_report', 'show_availability_toggle', 'show_total_hours'] as const;
type SettingKey = typeof settingsKeys[number];

type SettingItem = {
  key: SettingKey;
  label: string;
  description: string;
  icon: typeof PenLine;
  recommended?: boolean;
};

const settingsGroups: { id: string; title: string; description: string; icon: typeof ShieldCheck; items: SettingItem[] }[] = [
  {
    id: 'documentation',
    title: 'Dokumentation vid uppdrag',
    description: 'Vad chauffören måste samla in när ett uppdrag slutförs.',
    icon: ShieldCheck,
    items: [
      { key: 'require_signature', label: 'Kräv signatur vid slutförande', description: 'Föraren måste samla in mottagarens signatur innan uppdraget kan slutföras.', icon: PenLine, recommended: true },
      { key: 'require_photo', label: 'Kräv fraktsedelfoto', description: 'Föraren uppmanas att ta foto på fraktsedeln vid slutförande.', icon: Camera, recommended: true },
    ],
  },
  {
    id: 'app',
    title: 'Synligt i förarappen',
    description: 'Vilka funktioner och vyer chauffören ser i sin app.',
    icon: LayoutDashboard,
    items: [
      { key: 'show_time_report', label: 'Visa tidrapporter', description: 'Föraren kan se sin tidrapportssida med vecko- och månadsöversikt.', icon: Clock, recommended: true },
      { key: 'show_availability_toggle', label: 'Visa tillgänglighets-toggle', description: 'Föraren kan markera sig som ledig eller upptagen i sin profil.', icon: CircleDot },
      { key: 'show_total_hours', label: 'Visa totala timmar', description: 'Föraren kan se sina totala timmar i tidrapporten. Avaktivera för att dölja sammanställningen.', icon: Clock },
    ],
  },
];

const settingsConfig: SettingItem[] = settingsGroups.flatMap(g => g.items);

export default function AdminDriverSettings() {
  const { data: settings, isLoading } = useDriverSettings();
  const updateSettings = useUpdateDriverSettings();
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: overrides } = useAllDriverSettingsOverrides();
  const upsertOverride = useUpsertDriverSettingsOverride();
  const deleteOverride = useDeleteDriverSettingsOverride();

  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  const handleGlobalToggle = (key: SettingKey, value: boolean) => {
    if (!settings) return;
    updateSettings.mutate({ id: settings.id, [key]: value });
  };

  const selectedOverride = overrides?.find(o => o.driver_id === selectedDriverId);

  const handleDriverToggle = (key: SettingKey, value: boolean) => {
    if (!selectedDriverId) return;
    upsertOverride.mutate({ driver_id: selectedDriverId, [key]: value });
  };

  const handleResetToGlobal = (key: SettingKey) => {
    if (!selectedDriverId || !selectedOverride) return;
    // Set to null = use global
    upsertOverride.mutate({ driver_id: selectedDriverId, [key]: null as any });
  };

  const handleResetAllToGlobal = () => {
    if (!selectedDriverId) return;
    deleteOverride.mutate(selectedDriverId);
  };

  const getEffectiveValue = (key: SettingKey): boolean => {
    if (selectedOverride?.[key] !== null && selectedOverride?.[key] !== undefined) {
      return selectedOverride[key] as boolean;
    }
    return settings?.[key] ?? true;
  };

  const hasOverride = (key: SettingKey): boolean => {
    return selectedOverride?.[key] !== null && selectedOverride?.[key] !== undefined;
  };

  const driverHasAnyOverride = overrides?.some(o => o.driver_id === selectedDriverId) ?? false;

  const selectedDriver = drivers?.find(d => d.id === selectedDriverId);

  return (
    <AdminLayout title="Förarinställningar" description="Anpassa förarens app">
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-4 flex items-start gap-3">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Anpassa förarappen för ert företag</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Globala inställningar gäller alla förare. Du kan därefter göra undantag per chaufför längst ned.
              Inställningar märkta <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium align-middle"><Sparkles className="h-2.5 w-2.5" />Rekommenderad</span> ger bäst kvalitet i fakturaunderlag och dokumentation.
            </p>
          </div>
        </div>

        {/* Global defaults — grouped */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
        ) : (
          settingsGroups.map(group => (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <group.icon className="h-4 w-4 text-muted-foreground" />
                  {group.title}
                </CardTitle>
                <CardDescription className="text-xs">{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">{item.label}</Label>
                          {item.recommended && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">
                              <Sparkles className="h-2.5 w-2.5" /> Rekommenderad
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.[item.key] ?? true}
                      onCheckedChange={(v) => handleGlobalToggle(item.key, v)}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}

        {/* Per-driver overrides */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Per-chaufför inställningar
            </CardTitle>
            <CardDescription>
              Välj en chaufför för att åsidosätta globala inställningar. Inställningar markerade med en badge avviker från globala.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Välj chaufför..." />
                </SelectTrigger>
                <SelectContent>
                  {driversLoading ? (
                    <SelectItem value="_loading" disabled>Laddar...</SelectItem>
                  ) : (
                    drivers?.map(d => {
                      const hasOvr = overrides?.some(o => o.driver_id === d.id);
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-2">
                            {d.full_name}
                            {hasOvr && <span className="inline-block w-2 h-2 rounded-full bg-primary" />}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedDriverId && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedDriver?.full_name}</span>
                  </div>
                  {driverHasAnyOverride && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={handleResetAllToGlobal}
                      disabled={deleteOverride.isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Återställ alla
                    </Button>
                  )}
                </div>

                {settingsConfig.map((item) => {
                  const isOverridden = hasOverride(item.key);
                  const effectiveValue = getEffectiveValue(item.key);

                  return (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isOverridden ? 'bg-accent' : 'bg-primary/10'}`}>
                          <item.icon className={`h-4 w-4 ${isOverridden ? 'text-accent-foreground' : 'text-primary'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">{item.label}</Label>
                            {isOverridden && (
                              <Badge variant="secondary" className="text-[10px] py-0 cursor-pointer hover:bg-destructive/10" onClick={() => handleResetToGlobal(item.key)}>
                                Åsidosatt ✕
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isOverridden ? 'Egen inställning' : 'Använder globalt värde'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={effectiveValue}
                        onCheckedChange={(v) => handleDriverToggle(item.key, v)}
                        disabled={upsertOverride.isPending}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {!selectedDriverId && (
              <p className="text-sm text-muted-foreground text-center py-6">Välj en chaufför ovan för att anpassa deras inställningar</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
