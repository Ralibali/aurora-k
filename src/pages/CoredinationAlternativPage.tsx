import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, CreditCard, Calendar, Layers, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function CoredinationAlternativPage() {
  useEffect(() => {
    document.title = 'Coredination alternativ — enklare och billigare | Aurora Transport';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Letar du efter alternativ till Coredination? Fast pris 449 kr/mån, obegränsat antal användare. Kom igång på 5 min.');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <WhySwitch />
      <ComparisonTable />
      <ForWho />
      <FaqSection />
      <FinalCta />
      <Footer />
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
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-amber-500/10 text-sm font-medium text-amber-700 mb-6">
          Byter från Coredination?
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Det bästa <span className="text-primary">Coredination-alternativet</span> för svenska transportföretag
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
          Samma kärnfunktioner. Fast pris. Kom igång utan demo.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/register">Testa Aurora Transport — 449 kr/mån</Link>
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-8">
          <span>✓ Ingen bindningstid</span>
          <span>✓ Obegränsat antal användare</span>
          <span>✓ Igång på 5 minuter</span>
        </motion.div>
      </div>
    </section>
  );
}

function WhySwitch() {
  const cards = [
    { icon: CreditCard, title: 'Priset skenar med teamet', desc: 'Coredination-priset ökar per användare. Vi tar alltid 449 kr/mån — oavsett om du har 3 eller 30 förare.' },
    { icon: Calendar, title: 'Lång onboarding', desc: 'Coredination kräver demo och setup-hjälp. Med Aurora Transport är du igång på 5 minuter.' },
    { icon: Layers, title: 'Byggd för alla branscher', desc: 'Coredination är ett generalistverktyg. Vi är byggda specifikt för transport och bemanning.' },
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">
          Varför byta från Coredination?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Tre saker vi hör från företag som bytt.
        </motion.p>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div key={c.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-background rounded-xl border border-border p-6">
              <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <c.icon className="h-5 w-5 text-amber-600" />
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

function ComparisonTable() {
  type Row = { feature: string; aurora: string | true; core: string | true | false };
  const rows: Row[] = [
    { feature: 'Jobbdispatch', aurora: true, core: true },
    { feature: 'Mobilapp', aurora: true, core: true },
    { feature: 'Tidrapportering', aurora: true, core: true },
    { feature: 'Fortnox', aurora: true, core: true },
    { feature: 'Fast månadspris', aurora: true, core: false },
    { feature: 'Obegränsade användare', aurora: true, core: false },
    { feature: 'Kom igång utan demo', aurora: true, core: false },
    { feature: 'Självbetjäning', aurora: true, core: false },
  ];
  const textRows: { feature: string; aurora: string; core: string }[] = [
    { feature: 'Pris', aurora: '449 kr/mån', core: 'Kontakta för pris' },
    { feature: 'Bindningstid', aurora: 'Ingen', core: 'Varierar' },
    { feature: 'Onboardingtid', aurora: '5 minuter', core: 'Dagar–veckor' },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Aurora Transport vs Coredination
        </motion.h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-muted">Funktion</th>
                <th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-muted">Coredination</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                  <td className="px-5 py-3 text-foreground font-medium">{r.feature}</td>
                  <td className="px-5 py-3 text-center bg-primary/5">
                    {r.aurora === true ? <span className="text-green-600 font-bold">✓</span> : <span className="font-mono">{r.aurora}</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {r.core === true ? <span className="text-green-600 font-bold">✓</span> : r.core === false ? <span className="text-muted-foreground/30">✗</span> : <span className="font-mono">{r.core}</span>}
                  </td>
                </tr>
              ))}
              {textRows.map((r, i) => (
                <tr key={r.feature} className="border-t border-border">
                  <td className="px-5 py-3 text-foreground font-semibold">{r.feature}</td>
                  <td className="px-5 py-3 text-center bg-primary/5 font-mono font-bold text-primary">{r.aurora}</td>
                  <td className="px-5 py-3 text-center font-mono text-muted-foreground">{r.core}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

function ForWho() {
  const good = [
    'Litet/medelstort transportföretag',
    'Vill komma igång direkt',
    'Fast förutsägbart pris',
    'Ingen bindningstid',
  ];
  const notFor = [
    'Avancerade bygg-protokoll',
    'Maskinuthyrning med daglig tillsyn',
  ];
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Är Aurora Transport rätt för dig?
        </motion.h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="bg-background rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Check className="h-5 w-5 text-green-600" /> Perfekt för dig om du…</h3>
            <ul className="space-y-3">
              {good.map(g => (
                <li key={g} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />{g}</li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="bg-background rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><X className="h-5 w-5 text-muted-foreground" /> Kanske inte rätt om du behöver…</h3>
            <ul className="space-y-3">
              {notFor.map(n => (
                <li key={n} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="text-muted-foreground/50 mt-0.5 shrink-0">—</span>{n}</li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    { q: 'Kan jag importera data från Coredination?', a: 'Vi hjälper dig att komma igång snabbt. Kontakta oss på info@auroramedia.se så assisterar vi med migrationen.' },
    { q: 'Vad kostar det jämfört med Coredination?', a: 'Aurora Transport kostar 449 kr/mån oavsett antal användare. Coredination prissätts per användare, vilket gör det dyrare ju fler förare du har.' },
    { q: 'Förlorar jag funktioner?', a: 'Vi täcker kärnbehoven: dispatch, tidrapportering, GPS-spårning och export. Om du behöver avancerade bygg-protokoll kan Coredination passa bättre.' },
    { q: 'Hur snabbt kan jag komma igång?', a: 'Under 5 minuter. Registrera dig, bjud in förare och börja tilldela uppdrag direkt.' },
  ];
  return (
    <section className="py-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Vanliga frågor vid byte
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-muted rounded-xl border border-border px-5">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-20 bg-[hsl(222,47%,11%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
          Redo att byta till enklare och billigare?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Obegränsat antal användare. Ingen bindningstid.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[hsl(222,47%,11%)] hover:bg-white/90">
            <Link to="/register">Skapa ditt konto nu</Link>
          </Button>
        </motion.div>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3} variants={fadeUp} className="mt-6">
          <a href="mailto:info@auroramedia.se" className="text-slate-400 text-sm hover:text-white transition-colors">info@auroramedia.se</a>
        </motion.p>
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
          <Link to="/transportledningssystem" className="hover:text-white transition-colors">Transportledningssystem</Link>
          <a href="mailto:info@auroramedia.se" className="hover:text-white transition-colors">Kontakt</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500">© 2026 Aurora Media AB</p>
      </div>
    </footer>
  );
}
