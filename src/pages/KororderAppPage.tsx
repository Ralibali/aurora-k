import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, ArrowRight, CircleCheck as CheckCircle2, Smartphone, MapPin, Signature, Camera, Clock, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';
import { LeadFormModal } from '@/components/LeadFormModal';
import { track } from '@/lib/track';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function KororderAppPage() {
  const [open, setOpen] = useState(false);
  const openLead = (src: string) => { track('cta_click', { cta: 'book_demo', source: src, page: 'kororder-app' }); setOpen(true); };

  usePageMeta({
    title: 'Digital körorder app — uppdrag, signatur & GPS i mobilen | Aurora Transport',
    description: 'Digital körorder app för förare: uppdrag, adresser, kundsignatur, foto och tidrapportering i mobilen. Sluta ringa — allt synkas automatiskt.',
    canonical: 'https://auroratransport.se/kororder-app',
  });
  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Körorder app', url: 'https://auroratransport.se/kororder-app' },
  ], []));

  const features = [
    { icon: Smartphone, title: 'Uppdraget i mobilen', text: 'Föraren ser dagens uppdrag med adress, kontaktperson och instruktioner — inga utskrifter eller sms-trådar.' },
    { icon: MapPin, title: 'GPS & geofence', text: 'Ankomst och avfärd registreras automatiskt. Du ser var bilen är utan att ringa.' },
    { icon: Signature, title: 'Signatur på plats', text: 'Mottagaren signerar direkt på skärmen. Kvittensen sparas på uppdraget och skickas till kund.' },
    { icon: Camera, title: 'Foto vid leverans', text: 'Dokumentera gods, skador och leveransplats med bilder kopplade till uppdraget.' },
    { icon: Clock, title: 'Tidrapport automatiskt', text: 'Start- och stopptider blir färdiga tidrapporter med OB och traktamente — klara för löneunderlag.' },
    { icon: WifiOff, title: 'Funkar offline', text: 'Signera, fota och bekräfta utan täckning. Allt synkar när föraren är online igen.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto h-16 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center"><Truck className="h-4 w-4 text-primary-foreground" /></div>
            <span className="font-semibold">Aurora Transport</span>
          </Link>
          <Button size="sm" onClick={() => openLead('header')}>Boka 15 min demo</Button>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-16 pb-12 md:pt-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">Ingår i Aurora Transport</div>
          <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] [hyphens:auto]">
            Digital körorder app — körordern försvinner aldrig
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Ge föraren allt i mobilen: uppdrag, adresser, signatur, foto och tidrapportering. Du ser status i realtid — och fakturaunderlaget skapar sig självt.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => openLead('hero')} className="h-12 px-6">Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" /></Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6"><Link to="/">Se hela produkten</Link></Button>
          </div>
          <ul className="mt-7 grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-muted-foreground max-w-lg">
            {['Uppdrag & signatur i appen', 'GPS och automatiska tider', 'Funkar offline', 'Ingår i 449 kr/mån'].map(t => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card border-y border-border py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">En körorder app som gör hela jobbet</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-xl border border-border bg-background p-6">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">Vanliga frågor om digital körorder</h2>
        <Accordion type="single" collapsible className="mt-8 max-w-3xl">
          {[
            { q: 'Vad är en körorder?', a: 'Körordern är förarens arbetsorder: vad som ska hämtas, var det ska lämnas, hos vem och när. I Aurora Transport är den digital — alltid uppdaterad i förarens mobil.' },
            { q: 'Måste föraren ladda ner en app?', a: 'Nej, det fungerar direkt i mobilens webbläsare som en PWA. Föraren kan lägga den på hemskärmen som en vanlig app.' },
            { q: 'Vad händer om föraren saknar täckning?', a: 'Appen sparar signaturer, foton och status lokalt och synkar automatiskt när uppkoppling finns igen.' },
            { q: 'Vad kostar körorder appen?', a: 'Den ingår i Aurora Transport: 449 kr per månad för hela bolaget, utan bindningstid. Boka en demo så visar vi allt på 15 minuter.' },
          ].map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="bg-sidebar text-sidebar-foreground py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Släng papperskörordrarna idag</h2>
          <p className="mt-4 text-sidebar-foreground/80">Vi visar hur era förare får allt i mobilen — på 15 minuter.</p>
          <Button size="lg" onClick={() => openLead('final')} className="mt-7 h-12 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <LeadFormModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
