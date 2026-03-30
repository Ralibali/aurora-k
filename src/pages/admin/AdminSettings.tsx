import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings, useUpdateSettings, useCreateSettings } from '@/hooks/useData';
import { Save, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const createSettings = useCreateSettings();
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [uploading, setUploading] = useState(false);

  if (isLoading) {
    return <AdminLayout title="Inställningar"><div className="max-w-2xl space-y-6"><Skeleton className="h-64 w-full" /></div></AdminLayout>;
  }

  const f = form || settings || {};
  const setField = (key: string, value: any) => setForm(prev => ({ ...(prev || settings || {}), [key]: value }));

  const handleSave = () => {
    if (settings?.id) {
      updateSettings.mutate({ id: settings.id, ...form });
    } else {
      createSettings.mutate({ company_name: f.company_name || 'Aurora Medias Transport AB', ...form });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `logo.${ext}`;
    const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Kunde inte ladda upp: ' + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
    setField('logo_url', urlData.publicUrl);
    setUploading(false);
    toast.success('Logotyp uppladdad!');
  };

  return (
    <AdminLayout title="Inställningar">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Företagsinformation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Dessa uppgifter används i fakturor och PDF-exporter.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Företagsnamn</Label>
                <Input value={f.company_name || ''} onChange={e => setField('company_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Organisationsnummer</Label>
                <Input value={f.org_number || ''} onChange={e => setField('org_number', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Adress</Label>
                <Input value={f.address || ''} onChange={e => setField('address', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Postnummer & ort</Label>
                <Input value={f.zip_city || ''} onChange={e => setField('zip_city', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input value={f.email || ''} onChange={e => setField('email', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={f.phone || ''} onChange={e => setField('phone', e.target.value || null)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Betalningsuppgifter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bankgiro</Label>
                <Input value={f.bankgiro || ''} onChange={e => setField('bankgiro', e.target.value || null)} placeholder="123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Plusgiro</Label>
                <Input value={f.plusgiro || ''} onChange={e => setField('plusgiro', e.target.value || null)} placeholder="12 34 56-7" />
              </div>
              <div className="space-y-2">
                <Label>Momsregistreringsnummer</Label>
                <Input value={f.vat_number || ''} onChange={e => setField('vat_number', e.target.value || null)} placeholder="SE559000123401" />
              </div>
            </div>
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

        <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-1" /> {updateSettings.isPending ? 'Sparar...' : 'Spara inställningar'}
        </Button>
      </div>
    </AdminLayout>
  );
}
