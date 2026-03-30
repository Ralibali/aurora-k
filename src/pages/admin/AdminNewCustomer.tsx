import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pricingTypeLabels } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewCustomer() {
  const navigate = useNavigate();
  const [pricingType, setPricingType] = useState<string>('manual');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Kund skapad!');
    navigate('/admin/customers');
  };

  return (
    <AdminLayout title="Ny kund">
      <div className="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>
        <Card>
          <CardHeader><CardTitle>Skapa ny kund</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Företagsnamn *</Label>
                  <Input required placeholder="AB Exempelföretag" />
                </div>
                <div className="space-y-2">
                  <Label>Organisationsnummer</Label>
                  <Input placeholder="556000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Fakturaadress</Label>
                  <Input placeholder="Box 123, 111 22 Stockholm" />
                </div>
                <div className="space-y-2">
                  <Label>Besöksadress</Label>
                  <Input placeholder="Gatan 1, Stockholm" />
                </div>
                <div className="space-y-2">
                  <Label>Kontaktperson</Label>
                  <Input placeholder="Förnamn Efternamn" />
                </div>
                <div className="space-y-2">
                  <Label>E-post</Label>
                  <Input type="email" placeholder="namn@foretag.se" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input placeholder="08-123 45 67" />
                </div>
                <div className="space-y-2">
                  <Label>Betalningsvillkor (dagar)</Label>
                  <Input type="number" defaultValue={30} />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Prissättning</Label>
                <div className="flex gap-3 mb-3">
                  {(['per_delivery', 'per_hour', 'manual'] as const).map(t => (
                    <label key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${pricingType === t ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <input type="radio" name="pricing" checked={pricingType === t} onChange={() => setPricingType(t)} className="accent-primary" />
                      <span className="text-sm">{pricingTypeLabels[t]}</span>
                    </label>
                  ))}
                </div>
                {pricingType === 'per_delivery' && (
                  <div className="space-y-2"><Label>Pris per leverans (kr)</Label><Input type="number" placeholder="0" /></div>
                )}
                {pricingType === 'per_hour' && (
                  <div className="space-y-2"><Label>Timpris (kr)</Label><Input type="number" placeholder="0" /></div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Anteckningar</Label>
                <Textarea placeholder="Övriga noteringar..." />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit">Skapa kund</Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Avbryt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
