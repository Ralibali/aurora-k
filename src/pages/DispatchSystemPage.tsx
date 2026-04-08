import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Zap, Bell, Users, MapPin, Clock, Phone, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function DispatchSystemPage() {
  usePageMeta({
    title: 'Dispatch-system för transportföretag | Aurora Transport',
    description: 'Modernt dispatch-system för att tilldela uppdrag, följa förare i realtid och kommunicera med chaufförerna. Prova gratis.',
    canonical: 'https://auroratransport.se/dispatch-system',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Dispatch-system', url: 'https://auroratransport.se/dispatch-system' },
  ], []));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesGrid />
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
            description: 'Dispatch-system för transportföretag. Tilldela uppdrag, spåra förare och kommunicera digitalt.',
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
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-blue-500/10 text-sm font-medium text-blue-700 mb-6">
          ⚡ Snabbare dispatch = fler leveranser per dag
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Dispatch-system som ersätter telefon och whiteboard
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
          Tilldela uppdrag digitalt, följ förare i realtid och slipp ringa runt. Aurora Transport ger dispatchern full kontroll.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/register">Kom igång idag — 449 kr/mån</Link>
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-8">
          <span>✓ Tilldelning med ett klick</span>
          <span>✓ Live-karta</span>
          <span>✓ Push-notiser till förare</span>
        </motion.div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    { icon: Phone, title: 'Telefon-dispatch', desc: 'Du ringer runt till förare för att hitta vem som är ledig. 10 minuter per uppdrag.' },
    { icon: MapPin, title: 'Ingen realtidsöversikt', desc: 'Du vet inte var fordonen befinner sig. Kunden ringer och frågar — du vet inte svaret.' },
    { icon: Bell, title: 'Missade uppdrag', desc: 'Föraren missade SMS:et. Uppdraget blev inte utfört. Kunden blev inte informerad.' },
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 max-w-2xl mx-auto">
          Dispatcherns vardag — utan system.
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

function HowItWorks() {
  const steps = [
    { num: '1', title: 'Skapa uppdrag', desc: 'Fyll i kund, adress, tid och instruktioner. Under 30 sekunder.' },
    { num: '2', title: 'Tilldela förare', desc: 'Välj rätt förare från listan. De får notifiering direkt i mobilen.' },
    { num: '3', title: 'Följ i realtid', desc: 'Se status, position och tidsrapport live på dashboarden.' },
  ];
  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
          Så fungerar det
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div key={s.num} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4">{s.num}</div>
              <h3 className="font-semibold text-foreground text-lg mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    { icon: Zap, title: 'Snabb tilldelning', desc: 'Skapa och tilldela uppdrag på under en minut. Dra-och-släpp-planering i kalendervyn.' },
    { icon: MapPin, title: 'Live-karta', desc: 'Se alla fordon i realtid. Position, hastighet, riktning och senaste uppdatering.' },
    { icon: Bell, title: 'Push-notiser', desc: 'Föraren får direkt besked när ett nytt uppdrag tilldelats. Ingen risk att missa.' },
    { icon: Users, title: 'Prioritering', desc: 'Markera brådskande uppdrag som kritiska. Föraren ser prioriteten direkt i sin lista.' },
    { icon: Clock, title: 'Statusuppdatering', desc: 'Föraren uppdaterar status: accepterat → pågående → slutfört. Du ser det direkt.' },
    { icon: Truck, title: 'Fordonsöversikt', desc: 'Se vilka fordon som är ute, vilka som är lediga och vilka som behöver underhåll.' },
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
          Funktioner som gör dispatch snabbt
        </motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-background rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
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

function ComparisonTable() {
  const rows = [
    { feature: 'Digital uppdragstilldelning', aurora: true, old: false },
    { feature: 'Föraren ser uppdraget direkt', aurora: true, old: false },
    { feature: 'GPS-spårning i realtid', aurora: true, old: false },
    { feature: 'Automatisk statusuppdatering', aurora: true, old: false },
    { feature: 'Prioritetsnivåer', aurora: true, old: false },
    { feature: 'Historik och loggning', aurora: true, old: false },
  ];
  return (
    <section className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Dispatch-system vs telefon + whiteboard
        </motion.h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-muted">Funktion</th>
                <th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-muted">Telefon + whiteboard</th>
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
  { q: 'Vad är ett dispatch-system?', a: 'Ett digitalt verktyg som hjälper trafikledare att tilldela, schemalägga och följa upp transportuppdrag — istället för att ringa, SMSa eller använda whiteboard.' },
  { q: 'Hur snabbt kan jag tilldela ett uppdrag?', a: 'Under 30 sekunder. Fyll i kund, adress och tid, välj förare — klart. Föraren får besked direkt.' },
  { q: 'Kan jag se var alla fordon befinner sig?', a: 'Ja. Live-kartan visar alla aktiva förare med position, hastighet och riktning i realtid.' },
  { q: 'Fungerar det med min befintliga bilflotta?', a: 'Ja. Aurora Transport kräver inga hårdvaruinstallationer. Allt fungerar via mobilens webbläsare.' },
  { q: 'Vad kostar det?', a: '449 kr/mån fast pris. Obegränsat antal förare, fordon och uppdrag. Ingen bindningstid.' },
];

function FaqSection() {
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Vanliga frågor
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-background rounded-xl border border-border px-5">
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
          Redo att ersätta whiteboarden?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Digital dispatch. Realtidsspårning. Ingen bindningstid.
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
          <Link to="/budtjanst-app" className="hover:text-white transition-colors">Budtjänst-app</Link>
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
