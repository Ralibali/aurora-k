import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, ArrowRight, CircleCheck as CheckCircle2, Clock, Users, Route, Bell, FileText, Wallet } from 'lucide-react';
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

export default function TransportplaneringPage() {
  const [open, setOpen] = useState(false);
  const openLead = (src: string) => { track('cta_click', { cta: 'book_demo', source: src, page: 'transportplanering' }); setOpen(true); };

  usePageMeta({
    title: 'Transportplanering — system för planering av uppdrag & förare | Aurora Transport',
    description: 'Planera transportuppdrag och förare i ett enkelt system. Drag-and-drop, GPS, notiser och tidrapporter. 449 kr/mån, ingen bindningstid.',
    canonical: 'https://auroratransport.se/transportplanering',
  });
  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Transportplanering', url: 'https://auroratransport.se/transportplanering' },
  ], []));

  const features = [
    { icon: Route, title: 'Dra & släpp-planering', text: 'Tilldela uppdrag till rätt förare på sekunder. Se hela dagen på en skärm.' },
    { icon: Users, title: 'Förarstatus i realtid', text: 'Se vem som är ledig, på uppdrag eller offline — direkt i vyn.' },
    { icon: Bell, title: 'Automatiska notiser', text: 'Föraren får uppdraget direkt i appen. Inga missade jobb i WhatsApp.' },
    { icon: Clock, title: 'Tider rapporteras automatiskt', text: 'Start/stopp loggas av föraren — du får färdigt löne- och fakturaunderlag.' },
    { icon: FileText, title: 'Digital följesedel', text: 'Signatur, foton och anteckningar direkt på uppdraget.' },
    { icon: Wallet, title: 'Direkt till fakturering', text: 'Slutförda uppdrag blir fakturaunderlag med ett klick.' },
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
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">För åkerier, bud & bemanning</div>
          <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] [hyphens:auto]">
            Transportplanering som verkligen sparar tid
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Sluta jaga förare på telefon. Aurora Transport ger dig en visuell planeringsvy där du tilldelar uppdrag, ser förarstatus i realtid och får tidrapporter automatiskt — i samma system som hanterar fakturering.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => openLead('hero')} className="h-12 px-6">Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" /></Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6"><Link to="/">Se hela produkten</Link></Button>
          </div>
          <ul className="mt-7 grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-muted-foreground max-w-lg">
            {['449 kr/mån — fast pris', 'Ingen bindningstid', 'Support på svenska', 'Igång samma dag'].map(t => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card border-y border-border py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Det här ingår i transportplaneringen</h2>
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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">Vanliga frågor om transportplanering</h2>
        <Accordion type="single" collapsible className="mt-8 max-w-3xl">
          {[
            { q: 'Kan vi importera befintliga uppdrag?', a: 'Ja, du kan importera kunder och pågående uppdrag från Excel — vi hjälper till vid uppstart.' },
            { q: 'Hur snabbt kan vi komma igång?', a: 'De flesta kunder är igång samma dag. Onboarding-samtalet räcker ofta.' },
            { q: 'Vad krävs av förarna?', a: 'Bara förar-appen på sin mobil (iOS/Android). Inloggning sker via SMS.' },
            { q: 'Funkar det för bemanningsbolag?', a: 'Ja, du kan hantera flera kunder, separata prislistor och fakturera per kund.' },
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Se hur 15 minuter sparar er flera timmar i veckan</h2>
          <p className="mt-4 text-sidebar-foreground/80">Boka en kort demo — ingen säljpitch, bara en konkret genomgång av hur planeringen funkar för just er.</p>
          <Button size="lg" onClick={() => openLead('final')} className="mt-7 h-12 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <LeadFormModal open={open} onOpenChange={setOpen} />
    </div>
  );
}