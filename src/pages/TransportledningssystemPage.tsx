import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Zap, Clock, Users, MapPin, Smartphone, FileText, Check, MessageSquare, FileSpreadsheet, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

export default function TransportledningssystemPage() {
  useEffect(() => {
    document.title = 'Transportledningssystem för små och medelstora företag | Aurora Transport';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Enkelt transportledningssystem som samlar uppdrag, förare och tidrapporter. Kom igång samma dag. 449 kr/mån.');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesGrid />
      <ComparisonTable />
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
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex px-4 py-1.5 rounded-full bg-blue-50 text-sm font-medium text-blue-700 mb-6">
          Enkelt · Svenskt · Fast pris
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Transportledningssystem som faktiskt används i fält
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-slate-500 leading-relaxed mb-8 max-w-2xl mx-auto">
          Tilldela uppdrag, spåra förare och hantera tidrapporter — allt i en app.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
            <Link to="/register">Kom igång idag — 449 kr/mån</Link>
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400 mt-8">
          <span>✓ Ingen bindningstid</span>
          <span>✓ Gratis onboarding</span>
          <span>✓ Support på svenska</span>
        </motion.div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    { icon: MessageSquare, title: 'Uppdrag via SMS', desc: 'Förare missar jobb när allt sköts via meddelanden och telefonsamtal.' },
    { icon: FileSpreadsheet, title: 'Kalkylark istället för system', desc: 'Tidrapporter, uppdrag och löneunderlag blandas i olika filer.' },
    { icon: Phone, title: 'Planering via telefon', desc: 'Du ringer runt för att hitta ledig förare. Varje gång.' },
  ];
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 max-w-2xl mx-auto">
          Kör du fortfarande uppdrag via SMS och Excel?
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div key={c.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center mb-4">
                <c.icon className="h-5 w-5 text-red-500" />
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

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Skapa konto', desc: '2 minuter' },
    { num: '02', title: 'Bjud in förare', desc: 'De får mail' },
    { num: '03', title: 'Skapa uppdrag', desc: 'Föraren ser det direkt' },
    { num: '04', title: 'Rapportera', desc: 'Tidrapport automatiskt' },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
          Igång på fyra steg.
        </motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

function FeaturesGrid() {
  const features = [
    { icon: Zap, title: 'Jobbdispatch i realtid', desc: 'Skapa uppdrag och tilldela till rätt förare. Notifiering direkt i mobilen.' },
    { icon: Clock, title: 'Automatisk tidrapportering', desc: 'Förare stämplar in och ut. Timmar beräknas automatiskt.' },
    { icon: Users, title: 'Obegränsat antal förare', desc: 'Lägg till hela teamet. Ingen extra kostnad oavsett storlek.' },
    { icon: MapPin, title: 'GPS-spårning', desc: 'Se var dina förare befinner sig och vilka uppdrag som pågår just nu.' },
    { icon: Smartphone, title: 'Mobilapp utan installation', desc: 'PWA — fungerar direkt i webbläsaren. Inga app-installationer.' },
    { icon: FileText, title: 'Fortnox-export', desc: 'Exportera tidrapporter och faktureringsunderlag med ett klick.' },
  ];
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
          Allt ett transportföretag behöver.
        </motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
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
    { feature: 'Jobbdispatch i realtid', aurora: true, sheet: false, big: true },
    { feature: 'Mobilapp för förare', aurora: true, sheet: false, big: true },
    { feature: 'Fast pris oavsett användare', aurora: true, sheet: true, big: false },
    { feature: 'Kom igång samma dag', aurora: true, sheet: true, big: false },
    { feature: 'Automatisk tidrapportering', aurora: true, sheet: false, big: true },
    { feature: 'Support på svenska', aurora: true, sheet: false, big: '?' },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Aurora Transport vs alternativen
        </motion.h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-slate-50">Funktion</th>
                <th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-slate-50">Kalkylark</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-slate-50">Stora system</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-5 py-3 text-foreground font-medium">{r.feature}</td>
                  <td className="px-5 py-3 text-center bg-blue-50/50"><span className="text-green-600 font-bold">✓</span></td>
                  <td className="px-5 py-3 text-center">{r.sheet ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}</td>
                  <td className="px-5 py-3 text-center">{r.big === '?' ? <span className="text-slate-400">?</span> : r.big ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200">
                <td className="px-5 py-3 text-foreground font-semibold">Pris per månad</td>
                <td className="px-5 py-3 text-center bg-blue-50/50 font-mono font-bold text-primary">449 kr</td>
                <td className="px-5 py-3 text-center font-mono text-muted-foreground">0 kr*</td>
                <td className="px-5 py-3 text-center font-mono text-muted-foreground">800–3 000 kr+</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
        <p className="text-xs text-slate-400 mt-3 text-center">*Kalkylark kostar dig timmar varje vecka i administration.</p>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    { q: 'Vad är ett transportledningssystem?', a: 'Ett system som hjälper transportföretag att planera, tilldela och följa upp uppdrag digitalt — istället för via telefon, SMS eller kalkylark.' },
    { q: 'Passar det för mitt lilla åkeri?', a: 'Absolut. Aurora Transport är byggt specifikt för små och medelstora transport- och bemanningsföretag. Fast pris oavsett storlek.' },
    { q: 'Vad skiljer er från Coredination?', a: 'Enklare, billigare och snabbare. 449 kr/mån fast pris oavsett antal användare. Kom igång på 5 minuter utan att kontakta oss.' },
    { q: 'Behöver mina förare ladda ner en app?', a: 'Nej. Aurora Transport är en PWA som fungerar direkt i mobilens webbläsare utan installation.' },
    { q: 'Kan jag testa innan jag bestämmer mig?', a: 'Du kan komma igång direkt och avsluta när du vill. Ingen bindningstid.' },
  ];
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Vanliga frågor
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-white rounded-xl border border-slate-200 px-5">
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
          Redo att digitalisera din transportplanering?
        </motion.h2>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-slate-400 mb-8">
          449 kr/mån. Fast pris. Ingen bindningstid.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[#0F172A] hover:bg-white/90">
            <Link to="/register">Skapa ditt konto nu</Link>
          </Button>
        </motion.div>
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
          <Link to="/coredination-alternativ" className="hover:text-white transition-colors">Coredination-alternativ</Link>
          <a href="mailto:info@auroramedia.se" className="hover:text-white transition-colors">Kontakt</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500">© 2026 Aurora Media AB</p>
      </div>
    </footer>
  );
}
