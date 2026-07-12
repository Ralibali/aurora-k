import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Loader2, Package, Route, Send, Truck, UploadCloud } from 'lucide-react';

const serviceTypes = ['Kranbil', 'Budbil', 'Tippbil', 'Krokbil', 'TMA-skydd', 'Byggsäck', 'Maskintransport', 'Annat uppdrag'];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const brandedPages: Record<string, { name: string; description: string }> = {
  kranbilsakarna: { name: 'Kranbilsåkarna', description: 'Skicka in komplett underlag för kranbil, bygglogistik och transport.' },
  'aurora-transport': { name: 'Aurora Transport', description: 'Boka transport, bud eller specialuppdrag snabbt och strukturerat.' },
};

type FormState = {
  serviceType: string;
  pickupAddress: string;
  deliveryAddress: string;
  preferredDate: string;
  preferredTime: string;
  urgent: boolean;
  cargo: string;
  weight: string;
  liftNeeded: string;
  obstacles: string;
  company: string;
  contactName: string;
  phone: string;
  email: string;
  orgNumber: string;
  notes: string;
};

const initialForm: FormState = {
  serviceType: '', pickupAddress: '', deliveryAddress: '', preferredDate: '', preferredTime: '', urgent: false,
  cargo: '', weight: '', liftNeeded: '', obstacles: '', company: '', contactName: '', phone: '', email: '', orgNumber: '', notes: '',
};

function buildDescription(form: FormState, attachmentPaths: string[], brandName: string) {
  return [
    `Publik bokningssida: ${brandName}`,
    `Uppdragstyp: ${form.serviceType}`,
    `Hämtning: ${form.pickupAddress}`,
    `Leverans: ${form.deliveryAddress || 'Ej angivet'}`,
    `Önskad tid: ${form.preferredDate} ${form.preferredTime}`.trim(),
    `Brådskande: ${form.urgent ? 'Ja' : 'Nej'}`,
    `Gods/uppdrag: ${form.cargo}`,
    `Vikt/volym: ${form.weight || 'Ej angivet'}`,
    `Behövs lyft: ${form.liftNeeded || 'Ej angivet'}`,
    `Hinder på plats: ${form.obstacles || 'Ej angivet'}`,
    `Organisationsnummer: ${form.orgNumber || 'Ej angivet'}`,
    `Bilagor: ${attachmentPaths.length ? attachmentPaths.join(', ') : 'Inga'}`,
    `Övrigt: ${form.notes || '—'}`,
  ].join('\n');
}

function validateFiles(files: File[]) {
  if (files.length > MAX_FILES) throw new Error(`Du kan bifoga högst ${MAX_FILES} filer.`);
  for (const file of files) {
    if (!ALLOWED_FILE_TYPES.has(file.type)) throw new Error(`${file.name} har ett filformat som inte stöds.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} är större än 10 MB.`);
  }
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const brand = useMemo(() => brandedPages[slug ?? ''] ?? brandedPages['aurora-transport'], [slug]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const update = (key: keyof FormState, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const uploadFiles = async () => {
    validateFiles(files);
    const uploaded: string[] = [];
    for (const [index, file] of files.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `public/${requestId}/${index}-${safeName}`;
      const { error } = await supabase.storage.from('booking-attachments').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      uploaded.push(path);
    }
    return uploaded;
  };

  const handleFiles = (selected: File[]) => {
    try {
      validateFiles(selected);
      setFiles(selected);
    } catch (error) {
      setFiles([]);
      toast.error(error instanceof Error ? error.message : 'Bilagorna kunde inte användas.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceType || !form.pickupAddress || !form.preferredDate || !form.contactName || !form.phone || !form.email || !form.cargo) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }

    setIsSubmitting(true);
    try {
      const attachmentPaths = await uploadFiles();
      const title = `${form.serviceType} - ${form.pickupAddress}`;
      const description = buildDescription(form, attachmentPaths, brand.name);
      const preferredDate = `${form.preferredDate}${form.preferredTime ? ` ${form.preferredTime}` : ''}`;
      const { data, error } = await supabase.functions.invoke('public-booking', {
        body: {
          request_id: requestId,
          website,
          slug: slug ?? 'aurora-transport',
          customer_name: form.company || form.contactName,
          customer_email: form.email,
          customer_phone: form.phone,
          preferred_date: preferredDate,
          title,
          description,
          attachment_paths: attachmentPaths,
        },
      });
      if (error) throw error;
      if (!data?.order_number) throw new Error('Bokningen saknar ordernummer. Försök igen.');

      setOrderNumber(data.order_number);
      toast.success(data.duplicate ? 'Förfrågan var redan mottagen.' : 'Förfrågan skickad!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte skicka förfrågan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderNumber) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <Card className="mx-auto max-w-xl border-white/10 bg-white text-slate-950 shadow-2xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
            <h1 className="text-3xl font-bold">Tack! Vi har tagit emot din förfrågan.</h1>
            <p className="mt-3 text-muted-foreground">Ordernummer: <span className="font-mono font-semibold text-foreground">{orderNumber}</span></p>
            <p className="mt-4 text-muted-foreground">Vi granskar uppdraget och återkommer med bekräftelse, pris eller kompletterande frågor.</p>
            <Button asChild className="mt-6"><Link to="/boka">Skicka ny förfrågan</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.32),_transparent_34%)]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
          <div className="mt-8 max-w-3xl">
            <Badge className="mb-4 bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">{brand.name}</Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Boka transport på under 60 sekunder</h1>
            <p className="mt-5 text-lg text-slate-300">{brand.description} Fyll i uppdraget så återkommer vi snabbt.</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <Label htmlFor="website">Webbplats</Label>
          <Input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>

        <Card className="bg-white text-slate-950">
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Typ av uppdrag</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceTypes.map(type => (
              <button key={type} type="button" onClick={() => update('serviceType', type)} className={`rounded-xl border p-4 text-left transition ${form.serviceType === type ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'hover:border-blue-300'}`}>
                <Package className="mb-2 h-5 w-5 text-blue-600" />
                <span className="font-semibold">{type}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white text-slate-950">
          <CardHeader><CardTitle className="flex items-center gap-2"><Route className="h-5 w-5" /> Var och när?</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Hämtningsadress *</Label><Input value={form.pickupAddress} onChange={e => update('pickupAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Leveransadress</Label><Input value={form.deliveryAddress} onChange={e => update('deliveryAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Önskat datum *</Label><Input type="date" value={form.preferredDate} onChange={e => update('preferredDate', e.target.value)} /></div>
            <div className="space-y-2"><Label>Önskad tid</Label><Input type="time" value={form.preferredTime} onChange={e => update('preferredTime', e.target.value)} /></div>
            <label className="flex items-center gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" checked={form.urgent} onChange={e => update('urgent', e.target.checked)} /> Brådskande uppdrag</label>
          </CardContent>
        </Card>

        <Card className="bg-white text-slate-950">
          <CardHeader><CardTitle>Uppdragsinformation</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Vad ska transporteras? *</Label><Textarea value={form.cargo} onChange={e => update('cargo', e.target.value)} /></div>
            <div className="space-y-2"><Label>Vikt/volym</Label><Input value={form.weight} onChange={e => update('weight', e.target.value)} /></div>
            <div className="space-y-2"><Label>Behövs lyft?</Label><Input value={form.liftNeeded} onChange={e => update('liftNeeded', e.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Hinder på plats</Label><Textarea value={form.obstacles} onChange={e => update('obstacles', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="bg-white text-slate-950">
          <CardHeader><CardTitle>Kontakt och filer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Företag</Label><Input value={form.company} onChange={e => update('company', e.target.value)} /></div>
            <div className="space-y-2"><Label>Kontaktperson *</Label><Input value={form.contactName} onChange={e => update('contactName', e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefon *</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
            <div className="space-y-2"><Label>E-post *</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} /></div>
            <div className="space-y-2"><Label>Organisationsnummer</Label><Input value={form.orgNumber} onChange={e => update('orgNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>Bilagor</Label><Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={e => handleFiles(Array.from(e.target.files || []))} /></div>
            <p className="text-xs text-muted-foreground md:col-span-2">Högst 5 filer och 10 MB per fil. JPG, PNG, WebP eller PDF.</p>
            <div className="space-y-2 md:col-span-2"><Label>Övrigt</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} /></div>
            {files.length > 0 && <div className="md:col-span-2 rounded-xl bg-slate-50 p-3 text-sm"><UploadCloud className="mr-2 inline h-4 w-4" /> {files.length} fil(er) valda</div>}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={isSubmitting} className="h-14 w-full text-base">
          {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          Skicka transportförfrågan
        </Button>
      </form>
    </main>
  );
}
