import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileUp,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  UploadCloud,
} from 'lucide-react';

const serviceTypes = [
  { label: 'Kranbil', icon: Truck, description: 'Lyft, lossning och specialtransport' },
  { label: 'Budbil', icon: Package, description: 'Snabba leveranser och hämtningar' },
  { label: 'Tippbil', icon: Truck, description: 'Massor, material och schakt' },
  { label: 'Krokbil', icon: Truck, description: 'Containrar, flak och bygglogistik' },
  { label: 'TMA-skydd', icon: ShieldCheck, description: 'Säkerhet vid väg och arbetsplats' },
  { label: 'Byggsäck', icon: Package, description: 'Hämtning av säck och avfall' },
  { label: 'Maskintransport', icon: Truck, description: 'Maskiner, redskap och utrustning' },
  { label: 'Annat uppdrag', icon: FileUp, description: 'Beskriv behovet så löser vi resten' },
];

const brandedPages: Record<string, { name: string; description: string; accent: string }> = {
  kranbilsakarna: {
    name: 'Kranbilsåkarna',
    description: 'Skicka in en komplett transportförfrågan med adress, tid, bilder och uppdragsinformation.',
    accent: 'Kranbil, krokbil, tippbil och bygglogistik',
  },
  'aurora-transport': {
    name: 'Aurora Transport',
    description: 'Boka transport, bud eller specialuppdrag snabbt och strukturerat.',
    accent: 'Bud, transportledning och planerade uppdrag',
  },
};

type BookingForm = {
  serviceType: string;
  pickupAddress: string;
  deliveryAddress: string;
  preferredDate: string;
  preferredTime: string;
  urgent: string;
  cargo: string;
  weight: string;
  liftNeeded: string;
  obstacles: string;
  notes: string;
  company: string;
  contactName: string;
  phone: string;
  email: string;
  orgNumber: string;
  files: string;
};

const initialForm: BookingForm = {
  serviceType: '',
  pickupAddress: '',
  deliveryAddress: '',
  preferredDate: '',
  preferredTime: '',
  urgent: 'Nej',
  cargo: '',
  weight: '',
  liftNeeded: 'Vet ej',
  obstacles: '',
  notes: '',
  company: '',
  contactName: '',
  phone: '',
  email: '',
  orgNumber: '',
  files: '',
};

function buildDescription(form: BookingForm, orderNumber: string, brandName: string) {
  return [
    `Publik bokningssida: ${brandName}`,
    `Ordernummer: ${orderNumber}`,
    `Uppdragstyp: ${form.serviceType}`,
    `Hämtning: ${form.pickupAddress}`,
    `Leverans: ${form.deliveryAddress}`,
    `Önskad tid: ${form.preferredDate} ${form.preferredTime}`.trim(),
    `Brådskande: ${form.urgent}`,
    `Gods/uppdrag: ${form.cargo}`,
    `Vikt/volym: ${form.weight || 'Ej angivet'}`,
    `Behövs lyft: ${form.liftNeeded}`,
    `Hinder på plats: ${form.obstacles || 'Ej angivet'}`,
    `Organisationsnummer: ${form.orgNumber || 'Ej angivet'}`,
    `Filer/bilder: ${form.files || 'Ej bifogat i MVP'}`,
    `Övrigt: ${form.notes || '—'}`,
  ].join('\n');
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const brand = useMemo(() => brandedPages[slug ?? ''] ?? brandedPages['aurora-transport'], [slug]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [orderNumber, setOrderNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof BookingForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(form.serviceType);
    if (step === 2) return Boolean(form.pickupAddress && form.preferredDate);
    if (step === 3) return Boolean(form.cargo);
    if (step === 4) return Boolean(form.contactName && form.phone && form.email);
    return true;
  }, [form, step]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const number = `AT-${Math.floor(1000 + Math.random() * 9000)}`;
    const title = `${form.serviceType || 'Transportförfrågan'} - ${form.pickupAddress || form.company || form.contactName}`;
    const payload = {
      customer_name: form.company || form.contactName,
      customer_email: form.email || null,
      customer_phone: form.phone || null,
      preferred_date: form.preferredDate || null,
      title,
      description: buildDescription(form, number, brand.name),
      status: 'pending',
    };

    const { error } = await supabase.from('booking_requests').insert(payload);

    if (error) {
      const saved = JSON.parse(localStorage.getItem('aurora_public_booking_requests') || '[]');
      localStorage.setItem('aurora_public_booking_requests', JSON.stringify([{ id: number, created_at: new Date().toISOString(), ...payload }, ...saved]));
      toast.warning('Förfrågan sparades lokalt i demo-läge. Koppla Supabase/RLS för skarp publik inskickning.');
    } else {
      toast.success('Förfrågan skickad!');
    }

    setOrderNumber(number);
    setStep(6);
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.32),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.2),_transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Tillbaka
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <Badge className="mb-4 bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">{brand.accent}</Badge>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">Boka transport på under 60 sekunder</h1>
              <p className="mt-5 max-w-2xl text-lg text-slate-300">
                {brand.description} Vi återkommer med bekräftelse, pris eller kompletterande frågor.
              </p>
            </div>
            <Card className="border-white/10 bg-white/10 text-white backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-500 p-3"><Building2 className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-slate-300">Bokningssida för</p>
                    <p className="text-xl font-semibold">{brand.name}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
                  <div className="rounded-xl bg-white/10 p-3"><Clock className="mx-auto mb-1 h-4 w-4" />Snabbt</div>
                  <div className="rounded-xl bg-white/10 p-3"><MapPin className="mx-auto mb-1 h-4 w-4" />Tydligt</div>
                  <div className="rounded-xl bg-white/10 p-3"><CheckCircle2 className="mx-auto mb-1 h-4 w-4" />Bekräftas</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-blue-500' : 'bg-slate-800'}`} />
          ))}
        </div>

        <Card className="border-slate-800 bg-white text-slate-950 shadow-2xl">
          <CardContent className="p-5 md:p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold">Vad behöver du hjälp med?</h2><p className="text-slate-500">Välj den typ av uppdrag som passar bäst.</p></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {serviceTypes.map(item => {
                    const Icon = item.icon;
                    const active = form.serviceType === item.label;
                    return (
                      <button key={item.label} type="button" onClick={() => update('serviceType', item.label)} className={`rounded-2xl border p-4 text-left transition hover:border-blue-400 hover:shadow-md ${active ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}>
                        <Icon className={`mb-3 h-6 w-6 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold">Var och när?</h2><p className="text-slate-500">Fyll i plats och önskad tid så får transportledaren rätt underlag.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Hämtningsadress *</Label><Input value={form.pickupAddress} onChange={e => update('pickupAddress', e.target.value)} placeholder="Gata, ort, port/kod" /></div>
                  <div className="space-y-2"><Label>Leveransadress</Label><Input value={form.deliveryAddress} onChange={e => update('deliveryAddress', e.target.value)} placeholder="Gata, ort, port/kod" /></div>
                  <div className="space-y-2"><Label>Önskat datum *</Label><Input type="date" value={form.preferredDate} onChange={e => update('preferredDate', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Önskad tid</Label><Input type="time" value={form.preferredTime} onChange={e => update('preferredTime', e.target.value)} /></div>
                </div>
                <div className="flex gap-2"><Button type="button" variant={form.urgent === 'Nej' ? 'default' : 'outline'} onClick={() => update('urgent', 'Nej')}>Normal</Button><Button type="button" variant={form.urgent === 'Ja' ? 'default' : 'outline'} onClick={() => update('urgent', 'Ja')}>Brådskande</Button></div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold">Beskriv uppdraget</h2><p className="text-slate-500">Ju bättre underlag, desto snabbare kan uppdraget bekräftas.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2"><Label>Vad ska transporteras? *</Label><Textarea value={form.cargo} onChange={e => update('cargo', e.target.value)} placeholder="Beskriv gods, material, säck, maskin eller lyftbehov" /></div>
                  <div className="space-y-2"><Label>Vikt/volym om känt</Label><Input value={form.weight} onChange={e => update('weight', e.target.value)} placeholder="T.ex. 1 pall, 800 kg, 10 m³" /></div>
                  <div className="space-y-2"><Label>Behövs lyft?</Label><Input value={form.liftNeeded} onChange={e => update('liftNeeded', e.target.value)} placeholder="Ja, nej eller vet ej" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Finns hinder på plats?</Label><Textarea value={form.obstacles} onChange={e => update('obstacles', e.target.value)} placeholder="Trånga gator, låg frihöjd, bom, känsligt underlag, trafiksituation..." /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Övrig information</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Allt som kan hjälpa transportledaren" /></div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold">Kontaktuppgifter</h2><p className="text-slate-500">Vi använder detta för bekräftelse och eventuella följdfrågor.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Företag</Label><Input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Företagsnamn" /></div>
                  <div className="space-y-2"><Label>Kontaktperson *</Label><Input value={form.contactName} onChange={e => update('contactName', e.target.value)} placeholder="Namn" /></div>
                  <div className="space-y-2"><Label>Telefon *</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="070-..." /></div>
                  <div className="space-y-2"><Label>E-post *</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="namn@foretag.se" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Organisationsnummer</Label><Input value={form.orgNumber} onChange={e => update('orgNumber', e.target.value)} placeholder="Frivilligt" /></div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div><h2 className="text-2xl font-bold">Bilder och filer</h2><p className="text-slate-500">I MVP-läget anger du filnamn/länk. Skarp filuppladdning kan kopplas till Supabase Storage.</p></div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <UploadCloud className="mx-auto mb-3 h-10 w-10 text-blue-600" />
                  <p className="font-semibold">Lägg till bilder, ritningar eller PDF-underlag</p>
                  <p className="mt-1 text-sm text-slate-500">Skriv filnamn, länk eller anteckning så följer det med förfrågan.</p>
                  <Textarea className="mt-4 bg-white" value={form.files} onChange={e => update('files', e.target.value)} placeholder="T.ex. Bild på säck finns, ritning mailas separat, länk till Drive..." />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="py-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><CheckCircle2 className="h-9 w-9 text-green-600" /></div>
                <h2 className="text-3xl font-bold">Tack! Vi har tagit emot din förfrågan.</h2>
                <p className="mt-3 text-slate-500">Ordernummer: <span className="font-mono font-semibold text-slate-900">{orderNumber}</span></p>
                <p className="mx-auto mt-4 max-w-xl text-slate-600">Vi granskar uppdraget och återkommer med bekräftelse så snart som möjligt.</p>
                <div className="mt-6 flex justify-center gap-3"><Button asChild><Link to="/boka">Skicka ny förfrågan</Link></Button><Button variant="outline" asChild><Link to="/">Till startsidan</Link></Button></div>
              </div>
            )}

            {step < 6 && (
              <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Tillbaka</Button>
                {step < 5 ? (
                  <Button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue}>Nästa <ArrowRight className="ml-2 h-4 w-4" /></Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Skickar...' : 'Skicka förfrågan'} <ArrowRight className="ml-2 h-4 w-4" /></Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-400" /> Vi återkommer vid frågor</div>
          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-blue-400" /> Tydligt orderunderlag</div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /> Ingen inloggning krävs</div>
        </div>
      </section>
    </main>
  );
}
