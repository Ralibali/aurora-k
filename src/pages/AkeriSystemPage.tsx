import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Clock, Users, Shield, FileText, Wallet, Smartphone, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function AkeriSystemPage() {
  usePageMeta({
    title: 'System för åkerier — enkelt och prisvärt | Aurora Transport',
    description: 'Digitalisera ditt åkeri med ett modernt system för uppdrag, förare och tidrapporter. Från 449 kr/mån, fast pris.',
    canonical: 'https://auroratransport.se/akeri-system',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Åkerisystem', url: 'https://auroratransport.se/akeri-system' },
  ], []));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesGrid />
      <PricingInfo />
      <FaqSection />
      <FinalCta />
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Aurora Transport',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: 'System för åkerier. Hantera uppdrag, förare, tidrapporter och fakturering digitalt.',
            offers: { '@type': 'Offer', price: '449', priceCurrency: 'SEK' },
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
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Truck className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-bold text-foreground">Aurora Transport</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex"><Link to="/login">Logga in</Link></Button>
          <Button size="sm" asChild><Link to="/kontakt">Kom igång</Link></Button>
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
          🚛 Byggt för svenska åkerier
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Åkerisystem som föraren faktiskt använder
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
          Sluta med papper och Excel. Få full kontroll över uppdrag, OB-tillägg, traktamente och faktureringsunderlag — i ett system med fast pris.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/kontakt">Kom igång idag — 449 kr/mån</Link>
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-8">
          <span>✓ OB-tillägg automatiskt</span>
          <span>✓ Traktamente inbyggt</span>
          <span>✓ CSV-export av fakturaunderlag</span>
        </motion.div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    { icon: FileText, title: 'Pappersbaserade rutiner', desc: 'Uppdrag på lösa lappar. Tidrapporter i Excel. Föraren ringer in resultatet.' },
    { icon: Wallet, title: 'OB och traktamente — manuellt', desc: 'Du räknar OB-tillägg för hand. Traktamente baseras på uppskattning. Det tar timmar varje vecka.' },
    { icon: Clock, title: 'Ingen överblick', desc: 'Du vet inte vad som pågår just nu. Vilka jobb är klara? Vem har jobbat hur mycket?' },
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 max-w-2xl mx-auto">
          Vardagen för många åkeriägare idag.
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div key={c.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-background rounded-xl border border-border p-6">
              <div className="w-11 h-11 rounded-lg bg-destructive/10 flex items-center justify-center mb-4"><c.icon className="h-5 w-5 text-destructive" /></div>
              <h3 className="font-semibold text-foreground mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    { icon: Truck, title: 'Uppdragshantering', desc: 'Skapa uppdrag, tilldela till förare och följ status i realtid. Prioritetsnivåer, kundkoppling och instruktioner.' },
    { icon: Clock, title: 'Automatisk tidrapport', desc: 'Förare stämplar in/ut per uppdrag. Timmar, OB-tillägg och traktamente beräknas automatiskt.' },
    { icon: Settings, title: 'OB & traktamente', desc: 'Konfigurera scheman för kväll, natt och helg. Traktamentsnivåer baserat på arbetade timmar.' },
    { icon: Users, title: 'Obegränsat antal förare', desc: 'Lägg till hela teamet. Ingen extra kostnad oavsett storlek. Varje förare får en egen mobilapp.' },
    { icon: Shield, title: 'Förarinställningar', desc: 'Styr vad varje förare ser: dölj totalbelopp, kräv foto vid leverans, dölj tidrapportering.' },
    { icon: Smartphone, title: 'Mobil utan installation', desc: 'PWA — fungerar direkt i webbläsaren. Föraren öppnar en länk, lägger till på hemskärmen, klar.' },
  ];
  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
          Allt ett åkeri behöver
        </motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-muted rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><f.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingInfo() {
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Fast pris = inga överraskningar
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          449 kr/mån. Obegränsat med förare, fordon och uppdrag. Ingen bindningstid. Du vet exakt vad du betalar.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/kontakt">Testa nu — 449 kr/mån</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

const faqs = [
  { q: 'Passar det för ett litet åkeri?', a: 'Absolut. Aurora Transport är byggt specifikt för små och medelstora åkerier. Fast pris oavsett om du har 2 eller 20 förare.' },
  { q: 'Hanterar ni OB-tillägg?', a: 'Ja. Du konfigurerar OB-scheman (kväll, natt, helg) och systemet beräknar tilläggen automatiskt baserat på arbetade timmar.' },
  { q: 'Kan jag exportera faktureringsunderlag?', a: 'Ja. Exportera tidrapporter och faktureringsunderlag som CSV med ett klick.' },
  { q: 'Behöver mina förare ladda ner en app?', a: 'Nej. Det är en PWA — öppna länken i mobilen, lägg till på hemskärmen. Klart.' },
  { q: 'Finns det bindningstid?', a: 'Nej. Du betalar per månad och kan avsluta när du vill.' },
];

function FaqSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Vanliga frågor
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-muted rounded-xl border border-border px-5">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) }} />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-20 bg-[hsl(222,47%,11%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
          Redo att digitalisera ditt åkeri?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. OB-tillägg, traktamente och CSV-export — allt ingår.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[hsl(222,47%,11%)] hover:bg-white/90">
            <Link to="/kontakt">Skapa ditt konto nu</Link>
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
          <div className="flex items-center gap-2 mb-2"><Truck className="h-4 w-4 text-slate-400" /><span className="font-semibold text-white">Aurora Transport</span></div>
          <p className="text-sm text-slate-500">En produkt av Aurora Media AB · Org.nr 559272-0220</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">Hem</Link>
          <Link to="/tjanster" className="hover:text-white transition-colors">Tjänster</Link>
          <Link to="/akeri-system" className="hover:text-white transition-colors">Åkerisystem</Link>
          <Link to="/budtjanst-app" className="hover:text-white transition-colors">Budtjänst-app</Link>
          <Link to="/dispatch-system" className="hover:text-white transition-colors">Dispatch-system</Link>
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
