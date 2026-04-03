import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Truck, Clock, Users, MapPin, Smartphone, Zap, FileText,
  MessageSquare, FileSpreadsheet, Phone, Check, X, ChevronDown,
  Menu, ArrowRight, Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export default function LandingPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(role === 'admin' ? '/admin' : '/driver', { replace: true });
    }
  }, [user, role, loading, navigate]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* SEO - handled via Helmet-style in index.html */}

      {/* NAVBAR */}
      <Navbar />

      {/* HERO */}
      <HeroSection />

      {/* SOCIAL PROOF */}
      <SocialProofBar />

      {/* PROBLEM */}
      <ProblemSection />

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* FEATURES */}
      <FeaturesSection />

      {/* COMPARISON */}
      <ComparisonTable />

      {/* PRICING */}
      <PricingSection />

      {/* FAQ */}
      <FaqSection />

      {/* FINAL CTA */}
      <FinalCta />

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

/* ═══════════════════════ NAVBAR ═══════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleDemo = async (type: 'akeri' | 'bemanning') => {
    setDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login', {
        body: { type },
      });
      if (error || !data?.email) throw new Error(data?.error || 'Kunde inte skapa demo');
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) throw signInError;
      
      toast.success(`Inloggad som ${data.companyName}`);
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message || 'Demo-inloggning misslyckades');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm' : 'bg-white/80 backdrop-blur'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Aurora Transport</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#funktioner" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funktioner</a>
          <a href="#pris" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pris</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={demoLoading} className="gap-1.5 hidden sm:inline-flex">
                <Play className="h-3.5 w-3.5" />
                {demoLoading ? 'Laddar...' : 'Testa demo'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleDemo('akeri')} className="cursor-pointer">
                <div>
                  <p className="font-medium">Demo Åkeri AB</p>
                  <p className="text-xs text-muted-foreground">Transport & logistik</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDemo('bemanning')} className="cursor-pointer">
                <div>
                  <p className="font-medium">Demo Bemanning AB</p>
                  <p className="text-xs text-muted-foreground">Bemanning & personal</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

/* ═══════════════════════ HERO ═══════════════════════ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{
      backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-sm font-medium text-blue-700 mb-6">
                🚛 Byggd för svenska transport- och bemanningsföretag
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6"
            >
              Sluta hantera uppdrag i{' '}
              <span className="text-primary">Excel och WhatsApp.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
              className="text-xl text-slate-500 leading-relaxed mb-8 max-w-xl"
            >
              Aurora Transport ger ditt företag ett komplett system för jobbdispatch, personalhantering och tidrapportering — klart på 5 minuter.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <Button size="lg" asChild className="rounded-xl px-8 py-6 text-base font-semibold">
                <Link to="/register">Kom igång idag — 449 kr/mån</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild className="rounded-xl px-6 py-6 text-base">
                <a href="#funktioner">Se hur det fungerar ↓</a>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400"
            >
              <span>✓ Ingen bindningstid</span>
              <span>✓ Gratis onboarding</span>
              <span>✓ Support på svenska</span>
            </motion.div>
          </div>

          {/* Right — App mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 0 }} animate={{ opacity: 1, x: 0, rotate: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="lg:col-span-2 hidden lg:block"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 transform rotate-1">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-muted-foreground">Uppdrag #1042</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Pågående
                </span>
              </div>
              <p className="font-semibold text-lg text-foreground mb-3">Nilsson Åkeri AB</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">Upphämtning 08:30</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Göteborg → Stockholm</span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">JS</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Johan Svensson</p>
                    <p className="text-xs text-muted-foreground">Tilldelad</p>
                  </div>
                </div>
              </div>
              <button className="w-full bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg">
                Markera som slutförd
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ SOCIAL PROOF ═══════════════════════ */
function SocialProofBar() {
  return (
    <div className="bg-slate-50 border-y border-slate-200 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-sm text-slate-400">
          Används redan av: <span className="text-slate-500 font-medium">CJ Bemanning AB</span> · <span className="text-slate-400 italic">Ditt företag?</span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════ PROBLEM ═══════════════════════ */
const painCards = [
  { icon: MessageSquare, title: 'Uppdrag i chatten', desc: 'Förare missar jobb. WhatsApp-gruppen är ett kaos.' },
  { icon: FileSpreadsheet, title: 'Tidrapporter i Excel', desc: 'Timmar räknas ihop för hand. Fel uppstår. Löner försenas.' },
  { icon: Phone, title: 'Planering via telefon', desc: 'Du ringer runt för att hitta ledig förare. 10 minuter per tilldelning.' },
];

function ProblemSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 max-w-2xl mx-auto"
        >
          De flesta transportföretag förlorar tid på administration varje dag.
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {painCards.map((card, i) => (
            <motion.div
              key={card.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center mb-4">
                <card.icon className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */
const steps = [
  { num: '01', title: 'Skapa ditt konto', desc: 'Under 2 minuter' },
  { num: '02', title: 'Bjud in din personal', desc: 'De får mail direkt' },
  { num: '03', title: 'Börja tilldela uppdrag', desc: 'Föraren ser det direkt' },
];

function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-14"
        >
          Igång på tre steg.
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.num} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-center"
            >
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

/* ═══════════════════════ FEATURES ═══════════════════════ */
const features = [
  { icon: Zap, title: 'Jobbdispatch på sekunder', desc: 'Skapa och tilldela uppdrag med några klick. Föraren notifieras direkt.' },
  { icon: Clock, title: 'Digital tidrapportering', desc: 'Förare stämplar in/ut. Automatisk beräkning. Exportera till Fortnox.' },
  { icon: Users, title: 'Obegränsat antal förare', desc: 'Bjud in hela teamet. Ingen extra kostnad per användare.' },
  { icon: MapPin, title: 'Realtidsöversikt', desc: 'Se var dina förare befinner sig och vilka uppdrag som pågår.' },
  { icon: Smartphone, title: 'PWA — ingen app-install', desc: 'Fungerar direkt i webbläsaren. Lägg till på hemskärmen som en app.' },
  { icon: FileText, title: 'Fortnox-export', desc: 'Exportera tidrapporter och faktureringsunderlag med ett klick.' },
];

function FeaturesSection() {
  return (
    <section id="funktioner" className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4"
        >
          Allt du behöver. Inget du inte behöver.
        </motion.h2>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
          className="text-center text-muted-foreground mb-14 max-w-lg mx-auto"
        >
          Ett fokuserat verktyg för transportföretag som vill slippa administration.
        </motion.p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
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

/* ═══════════════════════ COMPARISON TABLE ═══════════════════════ */
const compRows = [
  { feature: 'Jobbdispatch i realtid', aurora: true, excel: false, core: true },
  { feature: 'Mobilapp för förare', aurora: true, excel: false, core: true },
  { feature: 'Fast pris per månad', aurora: true, excel: true, core: false },
  { feature: 'Obegränsat antal användare', aurora: true, excel: true, core: false },
  { feature: 'Kom igång utan demo', aurora: true, excel: true, core: false },
  { feature: 'Support på svenska', aurora: true, excel: false, core: true },
];

function ComparisonTable() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12"
        >
          Varför Aurora Transport?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="overflow-x-auto rounded-xl border border-slate-200"
        >
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-3.5 text-muted-foreground font-medium bg-slate-50">Funktion</th>
                <th className="px-5 py-3.5 text-center font-semibold text-primary-foreground bg-primary">Aurora Transport</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-slate-50">Excel/WhatsApp</th>
                <th className="px-5 py-3.5 text-center text-muted-foreground font-medium bg-slate-50">Coredination</th>
              </tr>
            </thead>
            <tbody>
              {compRows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-5 py-3 text-foreground font-medium">{r.feature}</td>
                  <td className="px-5 py-3 text-center bg-blue-50/50"><span className="text-green-600 font-bold">✓</span></td>
                  <td className="px-5 py-3 text-center">{r.excel ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}</td>
                  <td className="px-5 py-3 text-center">{r.core ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}</td>
                </tr>
              ))}
              {/* Price row */}
              <tr className="border-t border-slate-200">
                <td className="px-5 py-3 text-foreground font-semibold">Pris per månad</td>
                <td className="px-5 py-3 text-center bg-blue-50/50 font-mono font-bold text-primary">449 kr</td>
                <td className="px-5 py-3 text-center font-mono text-muted-foreground">0 kr*</td>
                <td className="px-5 py-3 text-center font-mono text-muted-foreground">~800 kr+</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
        <p className="text-xs text-slate-400 mt-3 text-center">*Excel kostar dig timmar varje vecka.</p>
      </div>
    </section>
  );
}

/* ═══════════════════════ PRICING ═══════════════════════ */
function PricingSection() {
  const setupItems = [
    'Personlig onboarding',
    'Vi konfigurerar systemet',
    'Genomgång med teamet',
    'Import av personal',
    'Support under uppstart',
  ];
  const monthlyItems = [
    'Obegränsat förare och admins',
    'Obegränsat antal uppdrag',
    'iOS, Android & webb (PWA)',
    'Tidrapportering & export',
    'Fortnox-export',
    'Support på svenska',
    'Alla framtida uppdateringar',
    'Ingen bindningstid',
  ];

  return (
    <section id="pris" className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-3"
        >
          Ett pris. Allt inkluderat.
        </motion.h2>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
          className="text-center text-muted-foreground mb-12"
        >
          Inga dolda avgifter. Inga per-användare-kostnader.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Setup card */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
            className="bg-white border border-slate-200 rounded-2xl p-8"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-muted-foreground mb-4">En gång</span>
            <div className="mb-1">
              <span className="text-5xl font-mono font-bold text-foreground">3 500 kr</span>
            </div>
            <p className="text-muted-foreground mb-6">Setup & onboarding</p>
            <ul className="space-y-3 mb-6">
              {setupItems.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Betalas en gång. Aldrig igen.</p>
          </motion.div>

          {/* Monthly card */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
            className="bg-primary text-primary-foreground rounded-2xl p-8"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-medium mb-4">Löpande</span>
            <div className="mb-1">
              <span className="text-5xl font-mono font-bold">449 kr/mån</span>
            </div>
            <p className="text-primary-foreground/70 mb-6">Obegränsat antal användare</p>
            <ul className="space-y-3 mb-6">
              {monthlyItems.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-300 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full bg-white text-primary hover:bg-white/90 rounded-xl py-3.5 font-semibold">
              <Link to="/register">Kom igång idag</Link>
            </Button>
            <p className="text-xs text-primary-foreground/60 text-center mt-3">Faktureras månadsvis. Avsluta när du vill.</p>
          </motion.div>
        </div>

        {/* Total callout */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}
          className="max-w-3xl mx-auto mt-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm text-muted-foreground">Första månaden totalt:</p>
            <p className="text-2xl font-mono font-bold text-foreground">3 949 kr</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Därefter 449 kr/mån.</p>
            <p className="text-xs text-slate-400">Inga per-användare-kostnader. Någonsin.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FAQ ═══════════════════════ */
const faqs = [
  { q: 'Vad är Aurora Transport?', a: 'Ett transportledningssystem för svenska transport- och bemanningsföretag. Dispatch, tidrapportering och personalhantering i en app.' },
  { q: 'Hur lång tid tar det att komma igång?', a: 'Under 5 minuter. Registrera, betala, bjud in förare, kör.' },
  { q: 'Behöver mina förare ladda ner en app?', a: 'Nej. PWA — fungerar direkt i mobilens webbläsare. Lägg till på hemskärmen som en vanlig app.' },
  { q: 'Kan jag avsluta när jag vill?', a: 'Ja. Ingen bindningstid. Månadsvis betalning.' },
  { q: 'Fungerar det med Fortnox?', a: 'Ja. Exportera tidrapporter med ett klick.' },
  { q: 'Vad skiljer er från Coredination?', a: 'Enklare, billigare och snabbare. 449 kr/mån fast pris oavsett antal användare. Kom igång på 5 minuter utan att kontakta oss.' },
];

function FaqSection() {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12"
        >
          Vanliga frågor
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-slate-50 rounded-xl border border-slate-200 px-5">
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ═══════════════════════ FINAL CTA ═══════════════════════ */
function FinalCta() {
  return (
    <section className="py-20 bg-[#0F172A] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold mb-4"
        >
          Redo att modernisera ditt transportföretag?
        </motion.h2>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
          className="text-slate-400 mb-8"
        >
          449 kr/mån. Fast pris. Ingen bindningstid.
        </motion.p>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
          <Button size="lg" asChild className="rounded-xl px-10 py-6 text-base font-semibold bg-white text-[#0F172A] hover:bg-white/90">
            <Link to="/register">Skapa ditt konto nu</Link>
          </Button>
        </motion.div>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3} variants={fadeUp}
          className="mt-6"
        >
          <a href="mailto:info@auroramedia.se" className="text-slate-400 text-sm hover:text-white transition-colors">
            info@auroramedia.se
          </a>
        </motion.p>
      </div>
    </section>
  );
}

/* ═══════════════════════ FOOTER ═══════════════════════ */
function Footer() {
  return (
    <footer className="bg-[#0F172A] border-t border-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-white">Aurora Transport</span>
            </div>
            <p className="text-sm text-slate-500">En produkt av Aurora Media AB</p>
            <p className="text-sm text-slate-500">Org.nr 559272-0220</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <a href="#funktioner" className="hover:text-white transition-colors">Transportledningssystem</a>
            <a href="#pris" className="hover:text-white transition-colors">Coredination-alternativ</a>
            <a href="#" className="hover:text-white transition-colors">Integritetspolicy</a>
            <a href="mailto:info@auroramedia.se" className="hover:text-white transition-colors">Kontakt</a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">© 2026 Aurora Media AB</p>
        </div>
      </div>
    </footer>
  );
}
