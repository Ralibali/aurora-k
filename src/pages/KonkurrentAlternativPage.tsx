import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Truck, CreditCard, Layers, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DemoBookingModal } from '@/components/DemoBookingModal';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

type CompetitorPage = {
  slug: string;
  name: string;
  title: string;
  description: string;
  heroSub: string;
  arguments: { title: string; desc: string }[];
  rows: { feature: string; aurora: string; competitor: string }[];
  faqs: { q: string; a: string }[];
};

const pages: CompetitorPage[] = [
  {
    slug: 'opter-alternativ',
    name: 'Opter',
    title: 'Opter-alternativ för små åkerier | Aurora Transport',
    description: 'Letar du efter alternativ till Opter? Aurora Transport har fast pris 449 kr/mån, obegränsat antal användare och är igång på 5 minuter.',
    heroSub: 'För åkerier som vill ha ett modernare, enklare och mer förutsägbart TMS utan offertprocess och implementationsprojekt.',
    arguments: [
      { title: 'Fast pris i stället för offert', desc: 'Aurora Transport kostar 449 kr/mån. Opter är ett enterprise-system där pris och upplägg normalt tas fram efter behov och offert.' },
      { title: 'Igång på 5 minuter', desc: 'Skapa konto, bjud in förare och börja lägga upp uppdrag direkt — utan ett stort implementationsprojekt.' },
      { title: 'Byggt för 1–20 bilar', desc: 'Aurora fokuserar på små och växande åkerier som behöver kärnflödet: order, förare, tidrapport och fakturaunderlag.' },
    ],
    rows: [
      { feature: 'Prismodell', aurora: '449 kr/mån fast pris', competitor: 'Offertbaserad enterprise-modell' },
      { feature: 'Kom igång', aurora: 'Självregistrering på 5 minuter', competitor: 'Projekt- eller säljarledd uppstart' },
      { feature: 'Målgrupp', aurora: 'Åkerier med 1–20 bilar', competitor: 'Större transportorganisationer' },
      { feature: 'Användare', aurora: 'Obegränsat antal ingår', competitor: 'Beror på avtal och upplägg' },
      { feature: 'Bindningstid', aurora: 'Ingen bindningstid', competitor: 'Beror på avtal' },
    ],
    faqs: [
      { q: 'Är Aurora Transport ett direkt Opter-byte?', a: 'Aurora Transport täcker kärnflödet för små åkerier: uppdrag, förare, tidrapportering, GPS och fakturaunderlag. Om ni behöver ett större enterprise-upplägg kan Opter vara mer rätt.' },
      { q: 'Vad kostar Aurora jämfört med Opter?', a: 'Aurora Transport kostar 449 kr/mån med obegränsat antal användare. För Opter bör du begära offert utifrån ert behov och jämföra total kostnad.' },
      { q: 'Passar Aurora för ett litet åkeri?', a: 'Ja, Aurora är byggt för åkerier och budfirmor som vill komma bort från Excel och telefon utan att starta ett stort IT-projekt.' },
      { q: 'Kan jag testa själv?', a: 'Ja. Skapa konto eller boka demo så kan du se flödet direkt.' },
    ],
  },
  {
    slug: 'workify-alternativ',
    name: 'Workify',
    title: 'Workify-alternativ med fast teampris | Aurora Transport',
    description: 'Jämför Workify med Aurora Transport: fast pris 449 kr/mån för hela teamet, obegränsat antal användare och ingen bindningstid.',
    heroSub: 'För transportföretag som vill slippa licenstänk per användare och i stället betala ett fast pris för hela teamet.',
    arguments: [
      { title: 'Fast pris för hela teamet', desc: 'Aurora tar 449 kr/mån oavsett hur många förare och admins du lägger till.' },
      { title: 'Obegränsade användare', desc: 'Du behöver inte välja vilka som får vara med i systemet. Alla förare kan bjudas in från start.' },
      { title: 'Transportfokuserat flöde', desc: 'Uppdrag, GPS, tidrapportering och fakturaunderlag sitter ihop i ett enkelt transportflöde.' },
    ],
    rows: [
      { feature: 'Prismodell', aurora: '449 kr/mån för hela teamet', competitor: 'Pris per användare eller paket' },
      { feature: 'Användare', aurora: 'Obegränsat antal ingår', competitor: 'Skalar med antal användare/paket' },
      { feature: 'Målgrupp', aurora: 'Åkerier, bud och bemanning', competitor: 'Bredare arbetsflöden och team' },
      { feature: 'Bindningstid', aurora: 'Ingen bindningstid', competitor: 'Beror på avtal' },
      { feature: 'Start', aurora: 'Igång på 5 minuter', competitor: 'Beror på valt upplägg' },
    ],
    faqs: [
      { q: 'Varför välja fast pris framför pris per användare?', a: 'För små transportföretag gör fast pris det enklare att bjuda in alla förare utan att kostnaden ändras varje gång teamet växer.' },
      { q: 'Har Aurora obegränsat antal förare?', a: 'Ja. Förare och admins ingår i samma fasta månadspris.' },
      { q: 'Är Aurora bara för transport?', a: 'Ja, Aurora Transport är renodlat för åkerier, budfirmor och transportbemanning.' },
      { q: 'Kan jag säga upp när jag vill?', a: 'Ja. Aurora har ingen bindningstid.' },
    ],
  },
  {
    slug: 'hogia-transport-alternativ',
    name: 'Hogia Transport',
    title: 'Hogia Transport-alternativ | Aurora Transport',
    description: 'Alternativ till Hogia Transport för mindre åkerier: fristående, transportfokuserat system med fast pris 449 kr/mån och ingen bindningstid.',
    heroSub: 'För åkerier som vill ha ett fristående och snabbt transportverktyg i stället för en del av en större ekonomisvit.',
    arguments: [
      { title: 'Fristående och fokuserat', desc: 'Aurora är byggt runt uppdrag, förare och tidrapport — inte som en modul i en större svit.' },
      { title: 'Ingen bindningstid', desc: 'Testa och väx i din takt utan att låsa upp dig i långa avtal.' },
      { title: 'Fast pris', desc: '449 kr/mån med obegränsat antal användare gör kostnaden enkel att förstå.' },
    ],
    rows: [
      { feature: 'Typ av system', aurora: 'Fristående transportverktyg', competitor: 'Del av större ekonomisvit' },
      { feature: 'Prismodell', aurora: '449 kr/mån fast pris', competitor: 'Beror på avtal, modul och upplägg' },
      { feature: 'Användare', aurora: 'Obegränsat antal ingår', competitor: 'Beror på avtal' },
      { feature: 'Målgrupp', aurora: 'Små och växande åkerier', competitor: 'Företag med bredare ekonomibehov' },
      { feature: 'Bindningstid', aurora: 'Ingen bindningstid', competitor: 'Beror på avtal' },
    ],
    faqs: [
      { q: 'Är Aurora ett ekonomisystem?', a: 'Nej. Aurora fokuserar på transportledning, tidrapportering och fakturaunderlag. Bokföring och ekonomi kan hanteras i separat system.' },
      { q: 'När passar Hogia Transport bättre?', a: 'Om ni vill samla transport och andra ekonomifunktioner i en större svit kan Hogia Transport vara relevant.' },
      { q: 'Vad kostar Aurora?', a: 'Aurora Transport kostar 449 kr/mån med obegränsat antal användare.' },
      { q: 'Behöver jag binda mig?', a: 'Nej. Aurora har ingen bindningstid.' },
    ],
  },
  {
    slug: 'pindeliver-alternativ',
    name: 'PinDeliver',
    title: 'PinDeliver-alternativ för åkerier och bud | Aurora Transport',
    description: 'Alternativ till PinDeliver för B2B-transport: Aurora Transport är byggt för åkeriers och budfirmors vardag med tidrapport och fakturaunderlag.',
    heroSub: 'För åkerier och budfirmor som kör B2B-uppdrag och behöver order, tidrapport och fakturaunderlag i samma flöde.',
    arguments: [
      { title: 'Byggt för B2B-vardagen', desc: 'Aurora är byggt för uppdrag mellan företag, återkommande kunder och intern transportledning.' },
      { title: 'Tidrapport och fakturaunderlag', desc: 'Förarens start, stopp och kommentarer kan användas direkt i löne- och fakturaflödet.' },
      { title: 'Inte bara sista milen', desc: 'PinDeliver har en tydlig e-handels- och sista-milen-vinkel. Aurora fokuserar på åkerier och budfirmor med bredare B2B-behov.' },
    ],
    rows: [
      { feature: 'Inriktning', aurora: 'B2B-transport för åkeri och bud', competitor: 'E-handel och sista milen' },
      { feature: 'Tidrapportering', aurora: 'Ingår i förarflödet', competitor: 'Beror på upplägg' },
      { feature: 'Fakturaunderlag', aurora: 'Ingår', competitor: 'Beror på upplägg' },
      { feature: 'Prismodell', aurora: '449 kr/mån fast pris', competitor: 'Beror på avtal och behov' },
      { feature: 'Användare', aurora: 'Obegränsat antal ingår', competitor: 'Beror på avtal' },
    ],
    faqs: [
      { q: 'Vad är skillnaden mot sista-milen-system?', a: 'Aurora är byggt för åkerier och budfirmor som hanterar B2B-uppdrag, tidrapportering och fakturaunderlag — inte enbart e-handelsleveranser.' },
      { q: 'Kan kunder följa leveransen?', a: 'Ja, Aurora har spårningslänkar och statusuppdateringar för kund.' },
      { q: 'Passar Aurora för budfirmor?', a: 'Ja. Aurora passar både budfirmor och mindre åkerier som vill samla uppdrag, förare och underlag.' },
      { q: 'Vad kostar Aurora?', a: '449 kr/mån, obegränsat antal användare och ingen bindningstid.' },
    ],
  },
  {
    slug: 'alystra-alternativ',
    name: 'Alystra',
    title: 'Alystra-alternativ för mindre åkerier | Aurora Transport',
    description: 'Alternativ till Alystra för åkerier med 1–20 bilar. Aurora Transport har fast pris, enkel uppstart och obegränsat antal användare.',
    heroSub: 'För mindre åkerier som vill ha ett enkelt transportledningssystem utan att bygga för en stor lastbilscentral från dag ett.',
    arguments: [
      { title: 'För 1–20 bilar', desc: 'Aurora är designat för små och växande åkerier som behöver komma igång snabbt.' },
      { title: 'Mindre systemtyngd', desc: 'Fokus ligger på kärnflödet: uppdrag, förare, tidrapport och fakturaunderlag.' },
      { title: 'Fast pris och ingen bindning', desc: '449 kr/mån oavsett antal användare, med möjlighet att avsluta utan bindningstid.' },
    ],
    rows: [
      { feature: 'Målgrupp', aurora: 'Åkerier med 1–20 bilar', competitor: 'Stora lastbilscentraler och bredare nätverk' },
      { feature: 'Prismodell', aurora: '449 kr/mån fast pris', competitor: 'Beror på avtal och upplägg' },
      { feature: 'Uppstart', aurora: 'Igång på 5 minuter', competitor: 'Beror på organisation och behov' },
      { feature: 'Användare', aurora: 'Obegränsat antal ingår', competitor: 'Beror på avtal' },
      { feature: 'Bindningstid', aurora: 'Ingen bindningstid', competitor: 'Beror på avtal' },
    ],
    faqs: [
      { q: 'När passar Aurora bättre än ett större system?', a: 'När ni är ett mindre åkeri och vill ha ett snabbt, prisvärt system för uppdrag, förare, tidrapport och fakturaunderlag.' },
      { q: 'Är Aurora byggt för lastbilscentraler?', a: 'Aurora kan användas av flera typer av transportföretag men är främst optimerat för mindre åkerier och budfirmor.' },
      { q: 'Hur många användare ingår?', a: 'Obegränsat antal förare och admins ingår i priset.' },
      { q: 'Vad kostar Aurora?', a: '449 kr/mån utan bindningstid.' },
    ],
  },
];

function getPage(pathname: string) {
  const slug = pathname.replace(/^\//, '');
  return pages.find(page => page.slug === slug) ?? pages[0];
}

export default function KonkurrentAlternativPage() {
  const location = useLocation();
  const [demoOpen, setDemoOpen] = useState(false);
  const page = getPage(location.pathname);
  const canonical = `https://auroratransport.se/${page.slug}`;

  usePageMeta({ title: page.title, description: page.description, canonical });
  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: `${page.name} alternativ`, url: canonical },
  ], [canonical, page.name]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero page={page} onDemo={() => setDemoOpen(true)} />
      <WhySwitch page={page} />
      <ComparisonTable page={page} />
      <FaqSection page={page} />
      <FinalCta page={page} onDemo={() => setDemoOpen(true)} />
      <Footer />
      <DemoBookingModal open={demoOpen} onOpenChange={setDemoOpen} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Aurora Transport',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: page.description,
        offers: { '@type': 'Offer', price: '449', priceCurrency: 'SEK' },
      }) }} />
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

function Hero({ page, onDemo }: { page: CompetitorPage; onDemo: () => void }) {
  return (
    <section className="pt-32 pb-20 bg-background" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-amber-500/10 text-sm font-medium text-amber-700 mb-6">
          Letar du efter alternativ till {page.name}?
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          {page.name}-alternativet för mindre transportföretag
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
          {page.heroSub}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={onDemo} className="rounded-xl px-8 py-6 text-base font-semibold">Boka demo <ArrowRight className="ml-2 h-4 w-4" /></Button>
          <Button size="lg" variant="outline" asChild className="rounded-xl px-8 py-6 text-base font-semibold"><Link to="/register">Skapa konto</Link></Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-8">
          <span>✓ 449 kr/mån</span><span>✓ Obegränsat antal användare</span><span>✓ Ingen bindningstid</span>
        </motion.div>
      </div>
    </section>
  );
}

function WhySwitch({ page }: { page: CompetitorPage }) {
  const icons = [CreditCard, Layers, Users];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">
          Varför välja Aurora framför {page.name}?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          En vederhäftig jämförelse utan påhittade konkurrentpriser.
        </motion.p>
        <div className="grid md:grid-cols-3 gap-6">
          {page.arguments.map((arg, index) => {
            const Icon = icons[index] ?? Layers;
            return (
              <motion.div key={arg.title} custom={index} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-background rounded-xl border border-border p-6">
                <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4"><Icon className="h-5 w-5 text-amber-600" /></div>
                <h3 className="font-semibold text-foreground mb-2">{arg.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{arg.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComparisonTable({ page }: { page: CompetitorPage }) {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Aurora Transport vs {page.name}
        </motion.h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-muted">Jämförelse</th><th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th><th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-muted">{page.name}</th></tr></thead>
            <tbody>
              {page.rows.map((row, index) => (
                <tr key={row.feature} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                  <td className="px-5 py-3 text-foreground font-semibold">{row.feature}</td>
                  <td className="px-5 py-3 text-center bg-primary/5 font-medium text-primary">{row.aurora}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

function FaqSection({ page }: { page: CompetitorPage }) {
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">Vanliga frågor</motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {page.faqs.map((faq, i) => (
            <AccordionItem key={faq.q} value={`faq-${i}`} className="bg-background rounded-xl border border-border px-5">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) }} />
      </div>
    </section>
  );
}

function FinalCta({ page, onDemo }: { page: CompetitorPage; onDemo: () => void }) {
  return (
    <section className="py-20 bg-[hsl(222,47%,11%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
          Se om Aurora är rätt {page.name}-alternativ för dig
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Obegränsat antal användare. Ingen bindningstid.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-3">
          <Button size="lg" onClick={onDemo} className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[hsl(222,47%,11%)] hover:bg-white/90">Boka demo</Button>
          <Button size="lg" asChild variant="outline" className="rounded-xl px-10 py-6 text-base font-semibold border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/register">Skapa konto</Link></Button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[hsl(222,47%,11%)] border-t border-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div><div className="flex items-center gap-2 mb-2"><Truck className="h-4 w-4 text-slate-400" /><span className="font-semibold text-white">Aurora Transport</span></div><p className="text-sm text-slate-500">En produkt av Aurora Media AB · Org.nr 559272-0220</p></div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400"><Link to="/" className="hover:text-white transition-colors">Hem</Link><Link to="/blogg" className="hover:text-white transition-colors">Blogg</Link><Link to="/tjanster" className="hover:text-white transition-colors">Tjänster</Link><Link to="/om-oss" className="hover:text-white transition-colors">Om oss</Link><Link to="/privacy" className="hover:text-white transition-colors">Integritetspolicy</Link></div>
      </div>
    </footer>
  );
}
