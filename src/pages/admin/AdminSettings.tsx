import { useState, lazy, Suspense } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings, useUpdateSettings, useCreateSettings } from '@/hooks/useData';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeatureSettings, useToggleFeature, useResetAllFeatures } from '@/hooks/useFeatureSettings';
import { Save, Upload, ToggleLeft, RotateCcw, Sun, Moon, Monitor, Building, Palette, CreditCard, ChevronRight, ArrowLeft, Sparkles } from 'lucide-react';
import { DemoDataTab } from '@/components/admin/DemoDataTab';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
const SubscriptionTab = lazy(() => import('@/components/SubscriptionTab'));

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Ljust läge', icon: Sun },
    { value: 'dark', label: 'Mörkt läge', icon: Moon },
    { value: 'system', label: 'Systemstandard', icon: Monitor },
  ] as const;
  return (
    <Card>
      <CardHeader><CardTitle>Utseende</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground mb-4">Välj hur Aurora Transport ska visas.</p>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors ${
              theme === opt.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
            }`}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

type SettingsSection = 'company' | 'features' | 'appearance' | 'demo' | 'subscription' | null;

const settingsMenu = [
  { key: 'company' as const, label: 'Företag', description: 'Namn, adress och betaluppgifter', icon: Building },
  { key: 'features' as const, label: 'Funktioner', description: 'Aktivera eller dölja moduler', icon: ToggleLeft },
  { key: 'appearance' as const, label: 'Utseende', description: 'Ljust, mörkt eller systemläge', icon: Palette },
  { key: 'demo' as const, label: 'Exempeldata', description: 'Visa eller ta bort exempeldata', icon: Sparkles },
  { key: 'subscription' as const, label: 'Prenumeration', description: 'Hantera ditt abonnemang', icon: CreditCard },
];

export default function AdminSettings() {
  const { companyId, loading: authLoading } = useAuth();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const createSettings = useCreateSettings();
  const [form, setForm] = useState<TablesUpdate<'settings'> | null>(null);
  const [uploading, setUploading] = useState(false);
  const isMobile = useIsMobile();
  const [mobileSection, setMobileSection] = useState<SettingsSection>(null);

  const { data: features, isLoading: featuresLoading } = useFeatureSettings();
  const toggleFeature = useToggleFeature();
  const resetFeatures = useResetAllFeatures();

  if (authLoading || isLoading) {
    return <AdminLayout title="Inställningar"><div className="max-w-2xl space-y-6"><Skeleton className="h-64 w-full" /></div></AdminLayout>;
  }

  if (!companyId) {
    return (
      <AdminLayout title="Inställningar" description="Företagsinformation och systemkonfiguration">
        <div className="max-w-2xl">
          <Card>
            <CardHeader><CardTitle>Inställningarna kunde inte visas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Kontot är inte kopplat till något företag ännu. Ladda om sidan eller logga in igen.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const f = form || settings || {};
  const setField = <K extends keyof TablesUpdate<'settings'>>(key: K, value: TablesUpdate<'settings'>[K]) => setForm(prev => ({ ...(prev || settings || {}), [key]: value }));
  const settingsPayload = {
    company_name: f.company_name || 'Aurora Medias Transport AB',
    org_number: f.org_number || null,
    address: f.address || null,
    zip_city: f.zip_city || null,
    email: f.email || null,
    phone: f.phone || null,
    bankgiro: f.bankgiro || null,
    plusgiro: f.plusgiro || null,
    vat_number: f.vat_number || null,
    invoice_mode: f.invoice_mode || 'invoice',
    logo_url: f.logo_url || null,
  };
  const isSavingSettings = updateSettings.isPending || createSettings.isPending;

  const handleSave = () => {
    if (settings?.id) {
      updateSettings.mutate({ id: settings.id, ...settingsPayload });
      return;
    }

    createSettings.mutate(settingsPayload);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `logo.${ext}`;
    const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
    setField('logo_url', urlData.publicUrl);
    setUploading(false);
    toast.success('Logotyp uppladdad!');
  };

  const grouped = (features ?? []).reduce<Record<string, typeof features>>((acc, feat) => {
    if (!feat) return acc;
    const cat = feat.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(feat);
    return acc;
  }, {});

  const categoryOrder = ['Operativt', 'Personal', 'Kunder', 'Ekonomi', 'Register', 'System'];

  // ── Shared tab content renderers ──
  const companyContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Företagsinformation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Dessa uppgifter används i fakturor och PDF-exporter.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Företagsnamn</Label><Input value={f.company_name || ''} onChange={e => setField('company_name', e.target.value)} /></div>
            <div className="space-y-2"><Label>Organisationsnummer</Label><Input value={f.org_number || ''} onChange={e => setField('org_number', e.target.value || null)} /></div>
            <div className="space-y-2"><Label>Adress</Label><Input value={f.address || ''} onChange={e => setField('address', e.target.value || null)} /></div>
            <div className="space-y-2"><Label>Postnummer & ort</Label><Input value={f.zip_city || ''} onChange={e => setField('zip_city', e.target.value || null)} /></div>
            <div className="space-y-2"><Label>E-post</Label><Input value={f.email || ''} onChange={e => setField('email', e.target.value || null)} /></div>
            <div className="space-y-2"><Label>Telefon</Label><Input value={f.phone || ''} onChange={e => setField('phone', e.target.value || null)} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Betalningsuppgifter</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Bankgiro</Label><Input value={f.bankgiro || ''} onChange={e => setField('bankgiro', e.target.value || null)} placeholder="123-4567" /></div>
            <div className="space-y-2"><Label>Plusgiro</Label><Input value={f.plusgiro || ''} onChange={e => setField('plusgiro', e.target.value || null)} placeholder="12 34 56-7" /></div>
            <div className="space-y-2"><Label>Momsregistreringsnummer</Label><Input value={f.vat_number || ''} onChange={e => setField('vat_number', e.target.value || null)} placeholder="SE559000123401" /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Faktureringsläge</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Välj om systemet ska skapa fullständiga fakturor eller enbart fakturaunderlag.</p>
          <Select value={f.invoice_mode || 'invoice'} onValueChange={v => setField('invoice_mode', v)}>
            <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Faktura (fullständig)</SelectItem>
              <SelectItem value="basis">Fakturaunderlag (specifikation)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Logotyp</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {f.logo_url ? (
            <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-4">
              <img src={f.logo_url} alt="Logotyp" className="h-16 max-w-[200px] object-contain" />
              <Button variant="outline" size="sm" onClick={() => setField('logo_url', null)}>Ta bort</Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Ladda upp företagets logotyp</p>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild><span>{uploading ? 'Laddar upp...' : 'Välj fil'}</span></Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
            </div>
          )}
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={isSavingSettings} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-1" /> {isSavingSettings ? 'Sparar...' : 'Spara inställningar'}
      </Button>
    </div>
  );

  const featuresContent = (
    <div className="space-y-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Aktiva funktioner</h2>
          <p className="text-xs text-muted-foreground">Välj vilka moduler som ska vara synliga. Avaktiverade funktioner döljs men data raderas inte.</p>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-1.5 shrink-0 sm:w-auto" disabled={resetFeatures.isPending}
          onClick={() => resetFeatures.mutate(undefined, {
            onSuccess: () => toast.success('Alla funktioner återställda till standard'),
            onError: () => toast.error('Kunde inte återställa'),
          })}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Återställ alla
        </Button>
      </div>
      {featuresLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        categoryOrder.map(cat => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <Card key={cat}>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{cat}</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y">
                {items.map(feat => (
                  <div key={feat.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{feat.label}</p>
                      {feat.description && <p className="text-xs text-muted-foreground mt-0.5">{feat.description}</p>}
                    </div>
                    <Switch
                      checked={feat.enabled}
                      onCheckedChange={(checked) => toggleFeature.mutate({
                        id: feat.id, enabled: checked, featureKey: feat.feature_key,
                        label: feat.label, description: feat.description,
                        category: feat.category, sortOrder: feat.sort_order,
                      })}
                      disabled={toggleFeature.isPending}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  const sectionContent: Record<string, React.ReactNode> = {
    company: companyContent,
    features: featuresContent,
    appearance: <AppearanceTab />,
    demo: <DemoDataTab />,
    subscription: (
      <Suspense fallback={<div className="space-y-4 py-12"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>}>
        <SubscriptionTab />
      </Suspense>
    ),
  };

  // ── Mobile: list → detail pattern ──
  if (isMobile) {
    const activeSectionMeta = settingsMenu.find(s => s.key === mobileSection);

    return (
      <AdminLayout title="Inställningar" description="Företagsinformation och systemkonfiguration">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            {!mobileSection ? (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {settingsMenu.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMobileSection(item.key)}
                    className="w-full flex items-center gap-4 rounded-xl bg-card border border-border p-4 text-left active:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={mobileSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => setMobileSection(null)}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium mb-4 active:opacity-70"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {activeSectionMeta?.label ?? 'Tillbaka'}
                </button>
                {sectionContent[mobileSection]}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AdminLayout>
    );
  }

  // ── Desktop: tabs as before ──
  return (
    <AdminLayout title="Inställningar" description="Företagsinformation och systemkonfiguration">
      <div className="max-w-3xl">
        <Tabs defaultValue="company">
          <TabsList className="mb-6">
            <TabsTrigger value="company">Företag</TabsTrigger>
            <TabsTrigger value="features" className="gap-1.5">
              <ToggleLeft className="h-3.5 w-3.5" /> Funktioner
            </TabsTrigger>
            <TabsTrigger value="appearance">Utseende</TabsTrigger>
            <TabsTrigger value="demo" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Exempeldata</TabsTrigger>
            <TabsTrigger value="subscription">Prenumeration</TabsTrigger>
          </TabsList>
          <TabsContent value="company">{companyContent}</TabsContent>
          <TabsContent value="features">{featuresContent}</TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="demo"><DemoDataTab /></TabsContent>
          <TabsContent value="subscription">
            <Suspense fallback={<div className="space-y-4 py-12"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>}>
              <SubscriptionTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
