import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, CreditCard, Calendar, Puzzle, Check, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <WhySwitch />
      <ComparisonTable />
      <MigrationSteps />
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
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
    <section className="pt-32 pb-20 bg-white" style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-amber-50 text-sm font-medium text-amber-700 mb-6">
          Byter från Coredination?
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Det bästa <span className="text-primary">Coredination-alternativet</span> för svenska transportföretag
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-slate-500 leading-relaxed mb-8 max-w-2xl mx-auto">
          Samma kärnfunktioner. Fast pris. Kom igång utan demo.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/register">Testa Aurora Transport — 449 kr/mån</Link>
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400 mt-8">
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
    { icon: CreditCard, title: 'Priset skenar med teamet', desc: 'Coredination-priset ökar per användare. Aurora Transport kostar alltid 449 kr/mån — oavsett om du har 3 eller 30 förare.' },
    { icon: Calendar, title: 'Lång onboarding', desc: 'Coredination kräver ofta demo och implementation. Med Aurora Transport är du igång samma dag du registrerar dig.' },
    { icon: Puzzle, title: 'Mer än du behöver', desc: 'Komplexa system med funktioner du aldrig använder. Aurora Transport fokuserar på det som faktiskt behövs i fält.' },
  ];
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">
          Varför byta från Coredination?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Tre saker vi hör från företag som bytt.
        </motion.p>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div key={c.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center mb-4">
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
  const rows = [
    { feature: 'Jobbdispatch i realtid', aurora: true, core: true },
    { feature: 'Mobilapp för förare', aurora: true, core: true },
    { feature: 'Tidrapportering', aurora: true, core: true },
    { feature: 'Fast pris oavsett användare', aurora: true, core: false },
    { feature: 'Kom igång utan demo', aurora: true, core: false },
    { feature: 'Ingen bindningstid', aurora: true, core: false },
    { feature: 'Fortnox-export', aurora: true, core: true },
    { feature: 'Support på svenska', aurora: true, core: true },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Aurora Transport vs Coredination
        </motion.h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-slate-50">Funktion</th>
                <th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-slate-50">Coredination</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-5 py-3 text-foreground font-medium">{r.feature}</td>
                  <td className="px-5 py-3 text-center bg-blue-50/50"><span className="text-green-600 font-bold">✓</span></td>
                  <td className="px-5 py-3 text-center">{r.core ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200">
                <td className="px-5 py-3 text-foreground font-semibold">Pris per månad</td>
                <td className="px-5 py-3 text-center bg-blue-50/50 font-mono font-bold text-primary">449 kr</td>
                <td className="px-5 py-3 text-center font-mono text-muted-foreground">~800 kr+</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

function MigrationSteps() {
  const steps = [
    { num: '01', title: 'Skapa konto', desc: 'Registrera dig på under 2 minuter.' },
    { num: '02', title: 'Bjud in dina förare', desc: 'De får en inbjudningslänk via e-post.' },
    { num: '03', title: 'Kör igång', desc: 'Börja skapa och tilldela uppdrag direkt.' },
  ];
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
          Byt på under 10 minuter.
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div key={s.num} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
              <div className="text-5xl font-mono font-bold text-primary/15 mb-3">{s.num}</div>
              <h3 className="font-semibold text-foreground text-lg mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    { q: 'Kan jag migrera data från Coredination?', a: 'Vi hjälper dig att komma igång snabbt. Kontakta oss så assisterar vi med migrationen.' },
    { q: 'Varför är Aurora Transport billigare?', a: 'Vi fokuserar på kärnfunktionerna för svenska transportföretag utan onödig komplexitet. Fast pris — inte per användare.' },
    { q: 'Har ni samma funktioner som Coredination?', a: 'Vi täcker kärnbehoven: dispatch, tidrapportering, GPS-spårning och export. Utan funktioner du aldrig använder.' },
    { q: 'Behöver jag boka en demo?', a: 'Nej. Skapa ett konto och börja använda systemet direkt. Behöver du hjälp finns vi på info@auroramedia.se.' },
    { q: 'Finns det en bindningstid?', a: 'Nej. Månadsvis betalning. Avsluta när du vill.' },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Vanliga frågor vid byte
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-slate-50 rounded-xl border border-slate-200 px-5">
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
    <section className="py-20 bg-[#0F172A] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
          Redo att byta till enklare och billigare?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Obegränsat antal användare. Ingen bindningstid.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[#0F172A] hover:bg-white/90">
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
    <footer className="bg-[#0F172A] border-t border-slate-800 py-10">
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
