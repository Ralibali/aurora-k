import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockSettings } from '@/lib/mock-data';
import { Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [logoPreview, setLogoPreview] = useState<string | null>(mockSettings.logo_url);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      toast.success('Logotyp uppladdad!');
    }
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
                <Input defaultValue={mockSettings.company_name} />
              </div>
              <div className="space-y-2">
                <Label>Organisationsnummer</Label>
                <Input defaultValue={mockSettings.org_number || ''} />
              </div>
              <div className="space-y-2">
                <Label>Adress</Label>
                <Input defaultValue={mockSettings.address || ''} />
              </div>
              <div className="space-y-2">
                <Label>Postnummer & ort</Label>
                <Input defaultValue={mockSettings.zip_city || ''} />
              </div>
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input defaultValue={mockSettings.email || ''} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input defaultValue={mockSettings.phone || ''} />
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
                <Input defaultValue={mockSettings.bankgiro || ''} placeholder="123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Plusgiro</Label>
                <Input defaultValue={mockSettings.plusgiro || ''} placeholder="12 34 56-7" />
              </div>
              <div className="space-y-2">
                <Label>Momsregistreringsnummer</Label>
                <Input defaultValue={mockSettings.vat_number || ''} placeholder="SE559000123401" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Logotyp</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {logoPreview ? (
              <div className="border rounded-lg p-4 bg-muted/30 flex items-center gap-4">
                <img src={logoPreview} alt="Logotyp" className="h-16 max-w-[200px] object-contain" />
                <Button variant="outline" size="sm" onClick={() => setLogoPreview(null)}>Ta bort</Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Ladda upp företagets logotyp</p>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild><span>Välj fil</span></Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => toast.success('Inställningar sparade!')} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-1" /> Spara inställningar
        </Button>
      </div>
    </AdminLayout>
  );
}
