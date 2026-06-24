import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, ArrowRight, CircleCheck as CheckCircle2, FileText, Camera, Signature, Smartphone, Shield, Clock } from 'lucide-react';
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

export default function DigitalFoljesedelPage() {
  const [open, setOpen] = useState(false);
  const openLead = (src: string) => { track('cta_click', { cta: 'book_demo', source: src, page: 'foljesedel' }); setOpen(true); };

  usePageMeta({
    title: 'Digital följesedel — signatur, foto & POD i appen | Aurora Transport',
    description: 'Ersätt papperssedlar med digital följesedel: kundsignatur, foton och POD direkt i förar-appen. Skickas automatiskt till kund.',
    canonical: 'https://auroratransport.se/digital-foljesedel',
  });
  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Digital följesedel', url: 'https://auroratransport.se/digital-foljesedel' },
  ], []));

  const features = [
    { icon: Signature, title: 'Kundsignatur i appen', text: 'Mottagaren signerar direkt på förarens mobil. Sparas på uppdraget.' },
    { icon: Camera, title: 'Foto vid lossning', text: 'Föraren kan ta bilder på gods, skador och leveransplats — direkt kopplade till uppdraget.' },
    { icon: FileText, title: 'POD som PDF', text: 'Proof of Delivery genereras automatiskt och skickas till kund via e-post.' },
    { icon: Smartphone, title: 'Funkar offline', text: 'Föraren kan signera och fota även utan täckning — synkar när nät finns.' },
    { icon: Shield, title: 'Spårbart och säkert', text: 'Allt loggas med tid, plats och förare. Inga försvunna pappersedlar.' },
    { icon: Clock, title: 'Direkt till fakturering', text: 'Signerad följesedel triggar fakturaunderlag — ni får betalt snabbare.' },
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
            Slut på papperssedlar — digital följesedel i mobilen
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Föraren får kundens signatur, tar foton och bekräftar leveransen direkt i appen. POD skickas automatiskt till kund — och fakturaunderlaget skapas på samma gång.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => openLead('hero')} className="h-12 px-6">Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" /></Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6"><Link to="/">Se hela produkten</Link></Button>
          </div>
          <ul className="mt-7 grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-muted-foreground max-w-lg">
            {['Signatur, foto & POD', 'Funkar offline', 'Skickas automatiskt till kund', 'Ingår i 449 kr/mån'].map(t => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card border-y border-border py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Allt en följesedel behöver — inget mer</h2>
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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">Vanliga frågor om digital följesedel</h2>
        <Accordion type="single" collapsible className="mt-8 max-w-3xl">
          {[
            { q: 'Är digital signatur juridiskt giltig?', a: 'Ja, en signatur på skärm är likvärdig som bevis på mottagen leverans.' },
            { q: 'Vad händer om föraren saknar täckning?', a: 'Allt sparas lokalt i appen och synkar automatiskt när uppkoppling finns igen.' },
            { q: 'Får kunden POD automatiskt?', a: 'Ja, så snart föraren signerar av uppdraget skickas PDF:en till angiven mottagare.' },
            { q: 'Kan vi anpassa följesedelns layout?', a: 'Ja, ni kan lägga in egen logotyp, kundnummer, referens och egna fält per uppdragstyp.' },
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pappersfri leverans — på 15 minuter</h2>
          <p className="mt-4 text-sidebar-foreground/80">Vi visar exakt hur följesedeln fungerar för era uppdragstyper.</p>
          <Button size="lg" onClick={() => openLead('final')} className="mt-7 h-12 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <LeadFormModal open={open} onOpenChange={setOpen} />
    </div>
  );
}