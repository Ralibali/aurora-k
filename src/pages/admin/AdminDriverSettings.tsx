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
import { Smartphone, PenLine, Camera, Clock, CircleDot, Users, User, RotateCcw } from 'lucide-react';

const settingsKeys = ['require_signature', 'require_photo', 'show_time_report', 'show_availability_toggle'] as const;
type SettingKey = typeof settingsKeys[number];

const settingsConfig: { key: SettingKey; label: string; description: string; icon: typeof PenLine }[] = [
  {
    key: 'require_signature',
    label: 'Kräv signatur vid slutförande',
    description: 'Föraren måste samla in mottagarens signatur innan uppdraget kan slutföras',
    icon: PenLine,
  },
  {
    key: 'require_photo',
    label: 'Kräv fraktsedelfoto',
    description: 'Föraren uppmanas att ta foto på fraktsedeln vid slutförande',
    icon: Camera,
  },
  {
    key: 'show_time_report',
    label: 'Visa tidrapporter',
    description: 'Föraren kan se sin tidrapportssida med vecko- och månadsöversikt',
    icon: Clock,
  },
  {
    key: 'show_availability_toggle',
    label: 'Visa tillgänglighets-toggle',
    description: 'Föraren kan markera sig som ledig eller upptagen i sin profil',
    icon: CircleDot,
  },
];

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
      <div className="space-y-6">
        {/* Global defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              Globala standardinställningar
            </CardTitle>
            <CardDescription>
              Dessa gäller alla förare som inte har egna inställningar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    onCheckedChange={(v) => handleGlobalToggle(item.key, v)}
                    disabled={updateSettings.isPending}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

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
