import { Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Truck, MapPin, Smartphone, FileText, Users, BarChart3,
  Car, CalendarDays, Globe, Check, ArrowRight, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const services = [
  {
    icon: Truck,
    title: 'Uppdragshantering & Dispatch',
    desc: 'Skapa, tilldela och följ uppdrag i realtid. Dra-och-släpp-planering, prioritetsnivåer, kundkoppling och automatisk statusuppdatering.',
  },
  {
    icon: Smartphone,
    title: 'Förarapp (PWA)',
    desc: 'Chaufförerna ser sina uppdrag, navigerar till adressen, rapporterar tid, tar foton och signerar leveranser — direkt i mobilen utan att ladda ner en app.',
  },
  {
    icon: MapPin,
    title: 'GPS & Live-karta',
    desc: 'Se var alla fordon befinner sig i realtid. Geofencing-stöd, hastighets- och riktningsdata, samt fullständig positionshistorik.',
  },
  {
    icon: FileText,
    title: 'Fakturering',
    desc: 'Generera fakturor direkt från slutförda uppdrag. Stöd för kundspecifika prislistor, artikelregister, momssatser och PDF-export.',
  },
  {
    icon: Globe,
    title: 'Kundportal',
    desc: 'Ge era kunder en egen portal där de kan lägga bokningsförfrågningar, följa leveransstatus och lämna nöjdhetsbetyg.',
  },
  {
    icon: BarChart3,
    title: 'Rapporter & Statistik',
    desc: 'Överblick av intäkter, leveransprecision, förarprestation och miljödata (CO2-utsläpp) i tydliga dashboards.',
  },
  {
    icon: Car,
    title: 'Fordonsregister',
    desc: 'Hantera era fordon med registreringsnummer, typ, tillverkare, modell och underhållsnoteringar.',
  },
  {
    icon: CalendarDays,
    title: 'Frånvarohantering',
    desc: 'Förare kan rapportera semester, sjukdom eller annan frånvaro. Administratörer godkänner och har full överblick i kalendervyn.',
  },
];

const pricing = [
  { label: 'Månadsavgift', value: '449 kr/mån' },
  { label: 'Startavgift', value: '3 500 kr (engångs)' },
  { label: 'Antal förare', value: 'Obegränsat' },
  { label: 'Antal fordon', value: 'Obegränsat' },
  { label: 'Uppdrag / månad', value: 'Obegränsat' },
  { label: 'GPS & Live-karta', value: 'Ingår' },
  { label: 'Kundportal', value: 'Ingår' },
  { label: 'Fakturering', value: 'Ingår' },
  { label: 'Support', value: 'E-post & chatt' },
];

const steps = [
  { num: '1', title: 'Registrera företaget', desc: 'Gå till auroratransport.se och klicka "Kom igång". Fyll i företagsnamn och organisationsnummer.' },
  { num: '2', title: 'Betala startavgift', desc: 'Slutför betalningen via Stripe. Du får omedelbar tillgång till systemet.' },
  { num: '3', title: 'Lägg till förare', desc: 'Bjud in dina chaufförer via e-post. De får en länk och kan börja direkt i mobilen.' },
  { num: '4', title: 'Skapa kunder & uppdrag', desc: 'Lägg in era kunder, skapa uppdrag och börja dispatcha.' },
  { num: '5', title: 'Fakturera', desc: 'När uppdraget är klart genererar du en faktura med ett klick.' },
];

const advantages = [
  'Fast, låg månadskostnad utan per-användare-prissättning',
  'Snabb onboarding — klart på 5 minuter, inte 5 veckor',
  'Modern mobilupplevelse för förare (PWA, ingen app att ladda ner)',
  'Svensk support, svenskt gränssnitt, svenska fakturor',
  'Inga dolda avgifter, ingen bindningstid',
];

export default function TjansterPage() {
  useEffect(() => {
    document.title = 'Våra tjänster — Transportledning, GPS, Fakturering | Aurora Transport';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Komplett transportledningssystem: uppdragshantering, förarapp, GPS-spårning, fakturering och kundportal. 449 kr/mån, obegränsat antal förare.');
  }, []);

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Tjänster', url: 'https://auroratransport.se/tjanster' },
  ], []));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ServicesGrid />
      <PricingSection />
      <Advantages />
      <OnboardingSteps />
      <FaqSection />
      <DemoSection />
      <FinalCta />
      <Footer />

      {/* JSON-LD SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Aurora Transport',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '449',
              priceCurrency: 'SEK',
              billingIncrement: 'P1M',
            },
            description: 'Komplett transportledningssystem för svenska åkerier och bemanningsföretag.',
          }),
        }}
      />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Aurora Transport</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
            <Link to="/login">Logga in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/register">Kom igång</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 bg-background" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-primary mb-6">
          Alla funktioner · Fast pris · Obegränsat
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Allt du behöver för att driva ditt åkeri — i ett system.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
          Aurora Transport digitaliserar hela kedjan från order till faktura. Webbaserat, mobiloptimerat och designat för att minska administrationen med upp till 70 %.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/register">Kom igång idag — 449 kr/mån</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/login">Testa demo</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function ServicesGrid() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
          <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Vad vi erbjuder
          </motion.h2>
          <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Åtta kraftfulla moduler — alla inkluderade i en fast månadsavgift.
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
          <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Enkel prissättning
          </motion.h2>
          <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
            En plan. Allt inkluderat. Inga dolda avgifter.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-primary p-6 text-center">
            <h3 className="text-xl font-bold text-primary-foreground">Aurora Transport</h3>
            <p className="text-4xl font-bold text-primary-foreground mt-2">449 kr<span className="text-lg font-normal opacity-80">/mån</span></p>
            <p className="text-sm text-primary-foreground/70 mt-1">+ 3 500 kr startavgift (engångs)</p>
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {pricing.slice(2).map((row) => (
              <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm font-medium text-foreground">{row.label}</span>
                <span className="text-sm text-muted-foreground">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="p-6 text-center">
            <Button size="lg" asChild className="rounded-xl px-10 py-5 text-base font-semibold">
              <Link to="/register">Kom igång nu <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Ingen bindningstid. Avsluta när du vill.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Advantages() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
          <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Varför välja Aurora?
          </motion.h2>
          <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
            Jämfört med Coredination och andra system — så här skiljer vi oss.
          </motion.p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {advantages.map((a, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="flex items-start gap-3 bg-card rounded-lg border border-border p-5"
            >
              <div className="mt-0.5 w-6 h-6 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
              </div>
              <span className="text-foreground font-medium">{a}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OnboardingSteps() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
          <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Kom igång på 5 minuter
          </motion.h2>
        </motion.div>

        <div className="space-y-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="flex gap-5"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                {s.num}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: 'Vad kostar Aurora Transport?', a: '449 kr/mån med en engångs startavgift på 3 500 kr. Obegränsat antal förare, fordon och uppdrag ingår. Inga dolda avgifter.' },
  { q: 'Behöver förarna ladda ner en app?', a: 'Nej. Aurora använder PWA-teknik (Progressive Web App). Förarna öppnar en länk i mobilen och kan lägga till den på hemskärmen — fungerar som en vanlig app utan App Store.' },
  { q: 'Hur lång tid tar det att komma igång?', a: 'Under 5 minuter. Registrera företaget, bjud in förare via e-post och börja skapa uppdrag direkt.' },
  { q: 'Finns det någon bindningstid?', a: 'Nej, ingen bindningstid. Du kan avsluta din prenumeration när som helst.' },
  { q: 'Kan mina kunder följa sina leveranser?', a: 'Ja. Via kundportalen kan era kunder lägga bokningsförfrågningar, följa leveransstatus i realtid och lämna nöjdhetsbetyg.' },
  { q: 'Fungerar GPS-spårningen i realtid?', a: 'Ja. Alla förare som har förarappen öppen delar sin position. Administratörer ser alla fordon på en live-karta med hastighet, riktning och positionshistorik.' },
  { q: 'Kan jag generera fakturor direkt från uppdrag?', a: 'Ja. När ett uppdrag är slutfört kan du generera en faktura med ett klick. Stöd för kundspecifika prislistor, artikelregister och PDF-export.' },
  { q: 'Hur skiljer sig Aurora från Coredination?', a: 'Aurora erbjuder fast pris utan per-användare-avgifter, snabbare onboarding, modern mobilupplevelse och svenskt gränssnitt — till en lägre totalkostnad.' },
];

function FaqSection() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
          <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Vanliga frågor
          </motion.h2>
          <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
            Svar på det vi oftast får höra.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-lg border border-border px-5">
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section className="py-16 bg-primary/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm font-medium text-primary mb-6">
            <Zap className="h-4 w-4" /> Ingen registrering krävs
          </motion.div>
          <motion.h2 custom={1} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Testa demo — helt gratis
          </motion.h2>
          <motion.p custom={2} variants={fadeUp} className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Utforska systemet med exempeldata. Logga in som admin eller förare och se hur Aurora fungerar i praktiken.
          </motion.p>
          <motion.div custom={3} variants={fadeUp}>
            <Button size="lg" variant="outline" asChild className="rounded-xl px-8 py-5 text-base font-semibold">
              <Link to="/login">Öppna demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-20 bg-[hsl(222,47%,11%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
          Redo att digitalisera ert åkeri?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Fast pris. Ingen bindningstid.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[hsl(222,47%,11%)] hover:bg-white/90">
            <Link to="/register">Skapa ditt konto nu</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[hsl(222,47%,11%)] border-t border-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-white">Aurora Transport</span>
          </div>
          <p className="text-sm text-slate-500">En produkt av Aurora Media AB · Org.nr 559272-0220</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">Hem</Link>
          <Link to="/transportledningssystem" className="hover:text-white transition-colors">Transportledningssystem</Link>
          <Link to="/coredination-alternativ" className="hover:text-white transition-colors">Coredination-alternativ</Link>
          <Link to="/om-oss" className="hover:text-white transition-colors">Om oss</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Integritetspolicy</Link>
          <a href="mailto:info@auroramedia.se" className="hover:text-white transition-colors">Kontakt</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500">© 2026 Aurora Media AB</p>
      </div>
    </footer>
  );
}
