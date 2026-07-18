import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, ArrowRight, CircleCheck as CheckCircle2, Users, CalendarClock, FileSpreadsheet, Building2, BadgeCheck, Zap } from 'lucide-react';
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

export default function TransportbemanningPage() {
  const [open, setOpen] = useState(false);
  const openLead = (src: string) => { track('cta_click', { cta: 'book_demo', source: src, page: 'transportbemanning' }); setOpen(true); };

  usePageMeta({
    title: 'System för transportbemanning — förare, uppdrag & tidrapporter | Aurora Transport',
    description: 'Bemanningsbolag inom transport: tilldela förare på sekunder, få färdiga tidrapporter med OB och traktamente och ge kunderna egen portal. 449 kr/mån.',
    canonical: 'https://auroratransport.se/transportbemanning',
  });
  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Transportbemanning', url: 'https://auroratransport.se/transportbemanning' },
  ], []));

  const features = [
    { icon: Users, title: 'Förarpool med status', text: 'Se direkt vilka förare som är tillgängliga, upptagna eller lediga — per dag och vecka.' },
    { icon: Zap, title: 'Tilldelning på sekunder', text: 'Skapa uppdraget, välj förare, klart. Föraren får allt i mobilen utan att du ringer.' },
    { icon: CalendarClock, title: 'Tidrapporter som stämmer', text: 'Start, stopp och raster rapporteras av föraren själv. Du godkänner med ett klick.' },
    { icon: FileSpreadsheet, title: 'Löneunderlag med OB & traktamente', text: 'OB-tillägg och traktamenten räknas automatiskt. Exportera färdigt underlag till lönesystemet.' },
    { icon: Building2, title: 'Kundportal för uppdragsgivare', text: 'Dina kunder bokar förare, följer uppdrag och laddar ner underlag — utan att mejla dig.' },
    { icon: BadgeCheck, title: 'Signatur & POD per uppdrag', text: 'Kundens signatur och leveransbevis dokumenteras automatiskt för varje pass.' },
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
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">För bemanningsbolag inom transport</div>
          <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] [hyphens:auto]">
            Systemet för transportbemanning — förare, uppdrag och tid i ett flöde
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Sluta pussla i Excel. Tilldela förare på sekunder, få korrekta tidrapporter med OB och traktamente och låt kunderna boka i egen portal.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => openLead('hero')} className="h-12 px-6">Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" /></Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6"><Link to="/">Se hela produkten</Link></Button>
          </div>
          <ul className="mt-7 grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-muted-foreground max-w-lg">
            {['Förarapp & kundportal ingår', 'Automatiskt löneunderlag', 'OB och traktamente', '449 kr/mån, ingen bindningstid'].map(t => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card border-y border-border py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Byggt för bemanningsvardagen</h2>
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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">Vanliga frågor från bemanningsbolag</h2>
        <Accordion type="single" collapsible className="mt-8 max-w-3xl">
          {[
            { q: 'Passar det för bemanning och inte bara åkerier?', a: 'Ja. Aurora Transport hanterar både egna uppdrag och uthyrda förare — förarpool, tillgänglighet, tidrapporter och kundportal är byggda för bemanningsflödet.' },
            { q: 'Hur fungerar löneunderlaget?', a: 'Förarens tidrapporter räknas automatiskt om med OB-tillägg och traktamente enligt era regler. Du exporterar färdigt underlag per period och förare.' },
            { q: 'Kan våra kunder boka förare själva?', a: 'Ja, i kundportalen lägger uppdragsgivaren in bokningsförfrågningar som du bekräftar. De följer uppdraget och hämtar underlag själva.' },
            { q: 'Vad kostar det?', a: '449 kr per månad för hela bolaget — obegränsat antal förare och kunder. Ingen bindningstid, igång samma dag.' },
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Bemanningsflödet som kör sig självt</h2>
          <p className="mt-4 text-sidebar-foreground/80">Vi visar hur era förare, kunder och tidrapporter hänger ihop — på 15 minuter.</p>
          <Button size="lg" onClick={() => openLead('final')} className="mt-7 h-12 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            Boka 15 min demo <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <LeadFormModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
