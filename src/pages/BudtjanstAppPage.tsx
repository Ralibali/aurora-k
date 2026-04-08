import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Camera, PenTool, MapPin, Smartphone, Clock, FileText, MessageSquare, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function BudtjanstAppPage() {
  usePageMeta({
    title: 'App för budtjänst och bud — hantera uppdrag digitalt | Aurora Transport',
    description: 'Perfekt app för budbilar och budföretag. Tilldela uppdrag, spåra förare och få signerade leveranskvitton. 449 kr/mån.',
    canonical: 'https://auroratransport.se/budtjanst-app',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Budtjänst-app', url: 'https://auroratransport.se/budtjanst-app' },
  ], []));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <ComparisonTable />
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
            description: 'App för budtjänst och budföretag. Tilldela uppdrag, spåra förare i realtid och få signerade leveranskvitton digitalt.',
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
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Aurora Transport</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex"><Link to="/login">Logga in</Link></Button>
          <Button size="sm" asChild><Link to="/register">Kom igång</Link></Button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 bg-background" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-green-500/10 text-sm font-medium text-green-700 mb-6">
          📦 Perfekt för budbilar och leveransföretag
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          App för budtjänst som håller koll på varje leverans
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
          Tilldela uppdrag, spåra förare i realtid och få digitala leveransbevis med foto och signatur — allt i en app.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/register">Kom igång idag — 449 kr/mån</Link>
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-8">
          <span>✓ Fotobevis vid leverans</span>
          <span>✓ Digital signatur</span>
          <span>✓ GPS-spårning i realtid</span>
        </motion.div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    { icon: MessageSquare, title: 'WhatsApp-kaos', desc: 'Uppdrag skickas via meddelanden. Förare missar leveranser. Ingen historik.' },
    { icon: FileText, title: 'Inget leveransbevis', desc: 'Kunden säger att paketet inte kommit. Du har inget bevis. Vem har rätt?' },
    { icon: Clock, title: 'Manuell rapportering', desc: 'Föraren ringer in sin tid. Du räknar ihop. Fel uppstår.' },
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 max-w-2xl mx-auto">
          Känner du igen dig?
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div key={c.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-background rounded-xl border border-border p-6">
              <div className="w-11 h-11 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                <c.icon className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const features = [
    { icon: Smartphone, title: 'Snabb uppdragstilldelning', desc: 'Skapa och tilldela leveransuppdrag på sekunder. Föraren ser uppdraget direkt i mobilen.' },
    { icon: MapPin, title: 'Realtidsspårning', desc: 'Se var alla budbilar befinner sig just nu. Ge kunden exakta uppdateringar.' },
    { icon: Camera, title: 'Fotobevis vid leverans', desc: 'Föraren tar ett foto vid avlämning. Beviset sparas automatiskt på uppdraget.' },
    { icon: PenTool, title: 'Digital signatur', desc: 'Mottagaren signerar direkt i mobilen. Ingen pappershantering.' },
    { icon: Clock, title: 'Automatisk tidrapport', desc: 'Förare stämplar in och ut. Timmar beräknas automatiskt. Exportera till lönesystem.' },
    { icon: FileText, title: 'Fakturering med ett klick', desc: 'Generera fakturor direkt från slutförda leveranser. Stöd för kundspecifika priser.' },
  ];
  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">
          Allt din budtjänst behöver
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Sex funktioner som ersätter Excel, WhatsApp och papperskvitton.
        </motion.p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-muted rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  const rows = [
    { feature: 'Digital uppdragstilldelning', aurora: true, manual: false },
    { feature: 'Fotobevis vid leverans', aurora: true, manual: false },
    { feature: 'Digital signatur', aurora: true, manual: false },
    { feature: 'GPS-spårning i realtid', aurora: true, manual: false },
    { feature: 'Automatisk tidrapport', aurora: true, manual: false },
    { feature: 'Fakturering från uppdrag', aurora: true, manual: false },
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Aurora Transport vs manuell hantering
        </motion.h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-muted">Funktion</th>
                <th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-muted">SMS + Excel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                  <td className="px-5 py-3 text-foreground font-medium">{r.feature}</td>
                  <td className="px-5 py-3 text-center bg-primary/5"><Check className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="px-5 py-3 text-center"><X className="h-4 w-4 text-muted-foreground/30 mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

const faqs = [
  { q: 'Fungerar appen utan installation?', a: 'Ja. Aurora Transport är en PWA som fungerar direkt i webbläsaren. Föraren lägger till den på hemskärmen — fungerar som en vanlig app.' },
  { q: 'Kan mottagaren signera digitalt?', a: 'Ja. Mottagaren signerar direkt på förarens mobilskärm. Signaturen sparas på uppdraget.' },
  { q: 'Kan jag se var mina budbilar är just nu?', a: 'Ja. Live-kartan visar alla förare med position, hastighet och riktning i realtid.' },
  { q: 'Vad kostar det?', a: '449 kr/mån fast pris. Obegränsat antal förare, bilar och uppdrag. Ingen bindningstid.' },
  { q: 'Kan jag generera fakturor direkt?', a: 'Ja. Skapa fakturor från slutförda uppdrag med ett klick. Stöd för kundspecifika priser och PDF-export.' },
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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question', name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }),
          }}
        />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-20 bg-[hsl(222,47%,11%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
          Redo att digitalisera dina leveranser?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Fotobevis. Digital signatur. Ingen bindningstid.
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
          <div className="flex items-center gap-2 mb-2"><Truck className="h-4 w-4 text-slate-400" /><span className="font-semibold text-white">Aurora Transport</span></div>
          <p className="text-sm text-slate-500">En produkt av Aurora Media AB · Org.nr 559272-0220</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">Hem</Link>
          <Link to="/tjanster" className="hover:text-white transition-colors">Tjänster</Link>
          <Link to="/akeri-system" className="hover:text-white transition-colors">Åkerisystem</Link>
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
