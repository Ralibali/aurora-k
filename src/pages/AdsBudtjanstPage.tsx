import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Truck, Clock, MapPin, Smartphone, Zap, FileText,
  Check, Play, Shield, ArrowRight, Camera, PenTool,
  Package, Star, ChevronRight,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageMeta } from '@/lib/use-page-meta';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';

/* ═══════════════════════ ANIMATIONS ═══════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(59,130,246,0.15)',
      '0 0 40px rgba(59,130,246,0.25)',
      '0 0 20px rgba(59,130,246,0.15)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

/* ═══════════════════════ PAGE ═══════════════════════ */
export default function AdsBudtjanstPage() {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  usePageMeta({
    title: 'Budtjänst-app — Dispatch & realtidsspårning | Aurora',
    description: 'Hantera bud, leveranser och förare digitalt. Realtidsspårning, kvittens med foto & signatur, och automatisk tidrapportering. 449 kr/mån.',
    canonical: 'https://auroratransport.se/ads/budtjanst',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Budtjänst-app', url: 'https://auroratransport.se/ads/budtjanst' },
  ], []));

  // Force dark feel via inline styles (page is self-contained)
  useEffect(() => {
    document.documentElement.style.setProperty('color-scheme', 'dark');
    return () => { document.documentElement.style.removeProperty('color-scheme'); };
  }, []);

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login', { body: { type: 'akeri' } });
      if (error || !data?.email) throw new Error(data?.error || 'Kunde inte skapa demo');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (signInError) throw signInError;
      toast.success(`Inloggad som ${data.companyName}`);
      setTimeout(() => navigate('/admin'), 500);
    } catch (err: any) {
      toast.error(err.message || 'Demo-inloggning misslyckades');
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-400/5 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <TopBar onDemo={handleDemo} demoLoading={demoLoading} />
        <HeroSection onDemo={handleDemo} demoLoading={demoLoading} />
        <TrustStrip />
        <PainPoints />
        <Features />
        <AppMockup />
        <Pricing onDemo={handleDemo} demoLoading={demoLoading} />
        <Testimonials />
        <FinalCta />
        <MiniFooter />
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Aurora Transport',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'Budtjänst-app med realtidsspårning, leveranskvittens och tidrapportering.',
        offers: { '@type': 'Offer', price: '449', priceCurrency: 'SEK' },
      })}} />
    </div>
  );
}

/* ═══════════════════════ TOP BAR ═══════════════════════ */
function TopBar({ onDemo, demoLoading }: { onDemo: () => void; demoLoading: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#050510]/90 backdrop-blur-xl border-b border-white/5' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white/90 tracking-tight">Aurora Transport</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDemo}
            disabled={demoLoading}
            className="hidden sm:inline-flex text-white/60 hover:text-white hover:bg-white/5 gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {demoLoading ? 'Laddar...' : 'Live-demo'}
          </Button>
          <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all">
            <Link to="/register">Kom igång</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════ HERO ═══════════════════════ */
function HeroSection({ onDemo, demoLoading }: { onDemo: () => void; demoLoading: boolean }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

  return (
    <section className="relative min-h-[90vh] flex items-center pt-16">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div style={{ y }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-sm font-medium text-blue-400 mb-6 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                För budtjänster & leveransföretag
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6"
            >
              Dispatch som{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                faktiskt fungerar.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
              className="text-lg sm:text-xl text-white/50 leading-relaxed mb-8 max-w-lg"
            >
              Sluta jaga bud via telefon och WhatsApp. Tilldela, spåra och kvittera leveranser — allt i en app.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 mb-4"
            >
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl px-8 py-6 text-base font-semibold shadow-2xl shadow-blue-600/25 hover:shadow-blue-500/40 transition-all duration-300 border-0">
                <Link to="/register">
                  Kom igång — 449 kr/mån
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl px-6 py-6 text-base gap-2 bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition-all"
                onClick={onDemo}
                disabled={demoLoading}
              >
                {demoLoading ? (
                  <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" /> Laddar...</span>
                ) : (
                  <><Play className="h-4 w-4" /> Testa live-demo</>
                )}
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}
              className="text-xs text-white/25"
            >
              Ingen registrering krävs för demo. Ingen bindningstid.
            </motion.p>
          </motion.div>

          {/* Hero visual — floating card */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <motion.div {...glowPulse} className="relative">
              {/* Main card */}
              <div className="bg-gradient-to-br from-[#0d1225] to-[#0a0f1e] rounded-2xl border border-white/[0.06] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-white/40 font-mono">LIVE</span>
                  </div>
                  <span className="text-xs text-white/30 font-mono">14:23</span>
                </div>

                {/* Delivery items */}
                {[
                  { id: '#2847', from: 'Södermalm', to: 'Kungsholmen', status: 'Levererad', statusColor: 'bg-green-400', driver: 'AE' },
                  { id: '#2848', from: 'Vasastan', to: 'Östermalm', status: 'Pågående', statusColor: 'bg-blue-400', driver: 'KL' },
                  { id: '#2849', from: 'Gamla Stan', to: 'Hammarby', status: 'Väntar', statusColor: 'bg-amber-400', driver: 'MS' },
                ].map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.15 }}
                    className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs font-mono text-blue-400 font-bold">
                      {d.driver}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/70 font-medium truncate">{d.from}</span>
                        <ChevronRight className="h-3 w-3 text-white/20 shrink-0" />
                        <span className="text-white/70 font-medium truncate">{d.to}</span>
                      </div>
                      <span className="text-xs text-white/25 font-mono">{d.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${d.statusColor}`} />
                      <span className="text-xs text-white/40">{d.status}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Stats bar */}
                <div className="mt-5 pt-4 border-t border-white/[0.04] grid grid-cols-3 gap-4">
                  {[
                    { label: 'Idag', value: '24' },
                    { label: 'Aktiva', value: '7' },
                    { label: 'I tid', value: '96%' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold text-white/80 font-mono">{s.value}</p>
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating notification */}
              <motion.div
                initial={{ opacity: 0, y: 20, x: -20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-[#0d1225] border border-white/[0.06] rounded-xl px-4 py-3 shadow-xl flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-white/60 font-medium">Leverans bekräftad</p>
                  <p className="text-[10px] text-white/25">#2847 · Kvittens med foto</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ TRUST STRIP ═══════════════════════ */
function TrustStrip() {
  const items = [
    'Ingen bindningstid',
    'Obegränsat antal bud',
    'Kvittens med foto & signatur',
    'Support på svenska',
  ];
  return (
    <div className="border-y border-white/[0.04] py-5 bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          {items.map(item => (
            <span key={item} className="flex items-center gap-2 text-sm text-white/30">
              <span className="h-1 w-1 rounded-full bg-blue-400" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ PAIN POINTS ═══════════════════════ */
function PainPoints() {
  const pains = [
    { emoji: '📱', title: 'Bud via SMS & WhatsApp', desc: 'Meddelanden försvinner. Ingen vet vem som gör vad.' },
    { emoji: '📋', title: 'Manuell kvittens', desc: 'Papper som tappas bort. Ingen dokumentation vid reklamation.' },
    { emoji: '⏰', title: 'Tidrapporter i Excel', desc: 'Timmar räknas ihop manuellt. Fel varje månad.' },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-center mb-4"
        >
          Känns det här bekant?
        </motion.h2>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
          className="text-center text-white/30 mb-16 max-w-md mx-auto"
        >
          De flesta budföretag hanterar fortfarande allt manuellt.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {pains.map((p, i) => (
            <motion.div
              key={p.title} custom={i + 1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative group"
            >
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
                <span className="text-3xl mb-4 block">{p.emoji}</span>
                <h3 className="font-semibold text-white/80 mb-2 text-lg">{p.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FEATURES ═══════════════════════ */
function Features() {
  const feats = [
    { icon: Zap, title: 'Dispatch på sekunder', desc: 'Skapa leverans, tilldela bud — budet ser det direkt i mobilen.', color: 'from-blue-500/20 to-blue-600/5 border-blue-500/10' },
    { icon: MapPin, title: 'Realtidsspårning', desc: 'Se var varje bud befinner sig just nu. Kunden kan följa leveransen.', color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/10' },
    { icon: Camera, title: 'Foto vid leverans', desc: 'Budet tar foto som bevis. Dokumentationen sparas automatiskt.', color: 'from-violet-500/20 to-violet-600/5 border-violet-500/10' },
    { icon: PenTool, title: 'Digital signatur', desc: 'Mottagaren signerar direkt på skärmen. Kvittens i realtid.', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/10' },
    { icon: Clock, title: 'Automatisk tidrapport', desc: 'In/ut-stämpling per leverans. OB-tillägg beräknas automatiskt.', color: 'from-green-500/20 to-green-600/5 border-green-500/10' },
    { icon: FileText, title: 'Faktureringsunderlag', desc: 'Generera underlag med ett klick. Exportera till Fortnox.', color: 'from-rose-500/20 to-rose-600/5 border-rose-500/10' },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-center mb-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-sm font-medium text-blue-400 mb-4">
            Allt du behöver
          </span>
        </motion.div>
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-4xl font-bold text-center mb-16"
        >
          Byggt för leveranser.
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {feats.map((f, i) => (
            <motion.div
              key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="group"
            >
              <div className={`bg-gradient-to-br ${f.color} border rounded-2xl p-6 h-full hover:scale-[1.02] transition-transform duration-300`}>
                <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors">
                  <f.icon className="h-5 w-5 text-white/70" />
                </div>
                <h3 className="font-semibold text-white/85 mb-2">{f.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ APP MOCKUP ═══════════════════════ */
function AppMockup() {
  return (
    <section className="py-24 relative">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Budet öppnar en länk.{' '}
            <span className="text-white/30">Klart.</span>
          </h2>
          <p className="text-white/30 max-w-md mx-auto">
            Ingen app att ladda ner. PWA som fungerar direkt i webbläsaren på alla enheter.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xs mx-auto"
        >
          {/* Phone frame */}
          <div className="relative">
            <div className="bg-gradient-to-b from-[#0d1225] to-[#080d1a] rounded-[2rem] border border-white/[0.08] p-3 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#050510] rounded-b-2xl" />

              <div className="bg-[#0a0f1e] rounded-[1.5rem] overflow-hidden pt-8">
                {/* Status bar */}
                <div className="px-5 pb-4">
                  <p className="text-xs text-white/25 font-mono">Dina leveranser</p>
                  <p className="text-xl font-bold text-white/80 mt-1">Idag</p>
                </div>

                {/* Delivery cards */}
                <div className="px-3 space-y-2 pb-4">
                  {[
                    { addr: 'Drottninggatan 42', time: '14:00', status: 'Pågående', color: 'bg-blue-400' },
                    { addr: 'Sveavägen 18', time: '14:30', status: 'Nästa', color: 'bg-amber-400' },
                    { addr: 'Birger Jarlsgatan 7', time: '15:00', status: 'Planerad', color: 'bg-white/20' },
                  ].map((d, i) => (
                    <motion.div
                      key={d.addr}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white/60 font-medium">{d.addr}</span>
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${d.color}`} />
                          <span className="text-[10px] text-white/30">{d.status}</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/20 font-mono">{d.time}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom nav */}
                <div className="border-t border-white/[0.04] px-4 py-3 flex justify-around">
                  {[Package, MapPin, Clock].map((Icon, i) => (
                    <div key={i} className={`p-2 rounded-lg ${i === 0 ? 'bg-blue-500/10' : ''}`}>
                      <Icon className={`h-5 w-5 ${i === 0 ? 'text-blue-400' : 'text-white/20'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════ PRICING ═══════════════════════ */
function Pricing({ onDemo, demoLoading }: { onDemo: () => void; demoLoading: boolean }) {
  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ett pris. Allt ingår.
          </h2>
          <p className="text-white/30">Inga dolda avgifter. Inga per-bud-kostnader.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent rounded-3xl blur-xl" />
          <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-3xl p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400 mb-4">
                  Fast pris
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl sm:text-6xl font-extrabold text-white font-mono">449</span>
                  <span className="text-lg text-white/30 font-medium">kr/mån</span>
                </div>
                <p className="text-sm text-white/25 mt-2">+ 3 500 kr engångsavgift (setup & onboarding)</p>
              </div>
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl px-8 py-6 font-semibold shadow-2xl shadow-blue-600/25 border-0 shrink-0">
                <Link to="/register">Kom igång nu <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Obegränsat antal bud',
                'Realtidsspårning & live-karta',
                'Foto & signatur vid leverans',
                'Automatisk tidrapportering',
                'OB-tillägg & traktamente',
                'Fortnox-export',
                'Mobilapp (PWA) — ingen nedladdning',
                'Support på svenska',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 py-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-blue-400" />
                  </div>
                  <span className="text-sm text-white/50">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-white/20">Ingen bindningstid. Avsluta när du vill.</p>
              <button onClick={onDemo} disabled={demoLoading} className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Testa demo först
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */
function Testimonials() {
  const quotes = [
    {
      text: 'Vi hade bud som missade leveranser dagligen. Nu ser alla vad som ska göras — direkt i telefonen. Enkelt.',
      name: 'Erik R.',
      role: 'VD, Stockholms Bud AB',
      initials: 'ER',
    },
    {
      text: 'Att kunna ta foto och signatur digitalt har sparat oss från reklamationer. Otrolig skillnad.',
      name: 'Fatima K.',
      role: 'Transportledare',
      initials: 'FK',
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-2xl sm:text-3xl font-bold text-center mb-12"
        >
          <Star className="h-5 w-5 text-amber-400 inline-block mr-2 -mt-1" />
          Vad våra kunder säger
        </motion.h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {quotes.map((q, i) => (
            <motion.div
              key={i} custom={i + 1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7 hover:border-white/[0.08] transition-colors"
            >
              <p className="text-white/50 mb-5 leading-relaxed italic">"{q.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-blue-400/10 flex items-center justify-center text-blue-400 font-bold text-sm border border-blue-500/20">
                  {q.initials}
                </div>
                <div>
                  <p className="font-semibold text-white/70 text-sm">{q.name}</p>
                  <p className="text-xs text-white/25">{q.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FINAL CTA ═══════════════════════ */
function FinalCta() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl sm:text-5xl font-extrabold mb-6 leading-tight"
        >
          Redo att sluta jaga bud{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            via telefon?
          </span>
        </motion.h2>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
          className="text-white/30 mb-8 text-lg"
        >
          449 kr/mån. Fast pris. Alla funktioner. Igång på 5 minuter.
        </motion.p>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}
        >
          <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl px-10 py-6 text-lg font-semibold shadow-2xl shadow-blue-600/25 border-0">
            <Link to="/register">
              Skapa ditt konto nu
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FOOTER ═══════════════════════ */
function MiniFooter() {
  return (
    <footer className="border-t border-white/[0.04] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-white/20" />
          <span className="text-sm text-white/30">Aurora Transport</span>
          <span className="text-xs text-white/15">· Aurora Media AB · 559272-0220</span>
        </div>
        <div className="flex gap-4 text-xs text-white/20">
          <Link to="/" className="hover:text-white/40 transition-colors">Hem</Link>
          <Link to="/privacy" className="hover:text-white/40 transition-colors">Integritetspolicy</Link>
          <a href="mailto:info@auroramedia.se" className="hover:text-white/40 transition-colors">Kontakt</a>
        </div>
      </div>
    </footer>
  );
}
