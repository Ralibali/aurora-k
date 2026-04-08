import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Truck, Clock, MapPin, Smartphone, Zap, FileText,
  Check, Play, ArrowRight, BarChart3, Users, Globe,
  Star, ChevronRight, CalendarDays, Route,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageMeta } from '@/lib/use-page-meta';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(139,92,246,0.15)',
      '0 0 40px rgba(139,92,246,0.25)',
      '0 0 20px rgba(139,92,246,0.15)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

export default function AdsTransportPage() {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  usePageMeta({
    title: 'Transportledningssystem — Planera, spåra & fakturera | Aurora',
    description: 'Komplett transportledningssystem med uppdragsplanering, GPS-spårning, kundportal och fakturering. Allt i ett. 449 kr/mån.',
    canonical: 'https://auroratransport.se/ads/transport',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Transportledningssystem', url: 'https://auroratransport.se/ads/transport' },
  ], []));

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
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/8 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-fuchsia-400/5 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <TopBar onDemo={handleDemo} demoLoading={demoLoading} />

        {/* HERO */}
        <section className="relative min-h-[90vh] flex items-center pt-16">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-sm font-medium text-violet-400 mb-6 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Komplett transportledning
                  </span>
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
                  All transportledning{' '}
                  <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
                    i en plattform.
                  </span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-lg sm:text-xl text-white/50 leading-relaxed mb-8 max-w-lg">
                  Planera uppdrag, följ leveranser i realtid, hantera kunder och skicka fakturor — allt från ett ställe.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-xl px-8 py-6 text-base font-semibold shadow-2xl shadow-violet-600/25 hover:shadow-violet-500/40 transition-all duration-300 border-0">
                    <Link to="/kontakt">Kom igång — 449 kr/mån<ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                  <Button variant="outline" size="lg" className="rounded-xl px-6 py-6 text-base gap-2 bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition-all" onClick={handleDemo} disabled={demoLoading}>
                    {demoLoading ? <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-violet-400 border-t-transparent rounded-full" /> Laddar...</span> : <><Play className="h-4 w-4" /> Testa live-demo</>}
                  </Button>
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-white/25">Ingen registrering krävs för demo. Ingen bindningstid.</motion.p>
              </motion.div>

              {/* Hero visual — dashboard */}
              <motion.div initial={{ opacity: 0, x: 40, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 1 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:block">
                <motion.div {...glowPulse} className="relative">
                  <div className="bg-gradient-to-br from-[#0d1225] to-[#0a0f1e] rounded-2xl border border-white/[0.06] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs text-white/40 font-mono">TRANSPORTÖVERSIKT</span>
                      <span className="text-xs text-white/30 font-mono">Vecka 15</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[{ label: 'Uppdrag', value: '147', change: '+12%' }, { label: 'I tid', value: '94%', change: '+3%' }, { label: 'Intäkt', value: '234k', change: '+8%' }].map(s => (
                        <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <p className="text-lg font-bold text-white/80 font-mono">{s.value}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-white/25 uppercase tracking-wider">{s.label}</p>
                            <span className="text-[10px] text-emerald-400 font-mono">{s.change}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {[
                      { title: 'Leverans Volvo Parts', customer: 'Volvo AB', status: 'Pågående', color: 'bg-violet-400' },
                      { title: 'Hämtning Schenker', customer: 'DB Schenker', status: 'Planerad', color: 'bg-amber-400' },
                      { title: 'Express Göteborg', customer: 'IKEA', status: 'Slutförd', color: 'bg-green-400' },
                    ].map((a, i) => (
                      <motion.div key={a.title} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.12 }} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/60 font-medium truncate">{a.title}</p>
                          <p className="text-xs text-white/25">{a.customer}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0"><span className={`h-1.5 w-1.5 rounded-full ${a.color}`} /><span className="text-xs text-white/40">{a.status}</span></div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <div className="border-y border-white/[0.04] py-5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
              {['Ingen bindningstid', 'Obegränsat antal uppdrag', 'Kundportal ingår', 'Support på svenska'].map(item => (
                <span key={item} className="flex items-center gap-2 text-sm text-white/30"><span className="h-1 w-1 rounded-full bg-violet-400" />{item}</span>
              ))}
            </div>
          </div>
        </div>

        {/* PAIN POINTS */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-center mb-4">Låter det bekant?</motion.h2>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center text-white/30 mb-16 max-w-md mx-auto">Fragmenterade system kostar tid och pengar.</motion.p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { emoji: '🔀', title: 'Olika system för allt', desc: 'GPS i ett system, fakturering i ett annat, uppdrag i ett tredje. Ingen överblick.' },
                { emoji: '📞', title: 'Ständiga telefonsamtal', desc: 'Kunder ringer och frågar var leveransen är. Förare ringer om ändringar.' },
                { emoji: '📊', title: 'Inga bra rapporter', desc: 'Hur många uppdrag kördes i tid? Vad kostar varje kund? Ingen vet.' },
              ].map((p, i) => (
                <motion.div key={p.title} custom={i + 1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
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

        {/* FEATURES */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-center mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-sm font-medium text-violet-400 mb-4">Allt i ett</span>
            </motion.div>
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-center mb-16">En plattform. Noll kaos.</motion.h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Zap, title: 'Uppdragsplanering', desc: 'Skapa, tilldela och prioritera uppdrag med dra-och-släpp.', color: 'from-violet-500/20 to-violet-600/5 border-violet-500/10' },
                { icon: MapPin, title: 'GPS & Live-karta', desc: 'Alla fordon på en karta. Se position, hastighet och rutt.', color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/10' },
                { icon: Globe, title: 'Kundportal', desc: 'Kunder följer leveranser, lägger förfrågningar och chattar.', color: 'from-purple-500/20 to-purple-600/5 border-purple-500/10' },
                { icon: FileText, title: 'Fakturering', desc: 'Generera fakturor från uppdrag. Kundspecifika prislistor.', color: 'from-rose-500/20 to-rose-600/5 border-rose-500/10' },
                { icon: BarChart3, title: 'Statistik & Rapporter', desc: 'Intäkter, leveransprecision och miljödata i dashboards.', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/10' },
                { icon: CalendarDays, title: 'Kalender & Schema', desc: 'Visuell planeringskalender. Frånvaro och bemanning.', color: 'from-teal-500/20 to-teal-600/5 border-teal-500/10' },
              ].map((f, i) => (
                <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="group">
                  <div className={`bg-gradient-to-br ${f.color} border rounded-2xl p-6 h-full hover:scale-[1.02] transition-transform duration-300`}>
                    <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors"><f.icon className="h-5 w-5 text-white/70" /></div>
                    <h3 className="font-semibold text-white/85 mb-2">{f.title}</h3>
                    <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ett pris. Allt ingår.</h2>
              <p className="text-white/30">Inga dolda avgifter. Inga modulkostnader.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent rounded-3xl blur-xl" />
              <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-3xl p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-400 mb-4">Allt ingår</span>
                    <div className="flex items-baseline gap-1"><span className="text-5xl sm:text-6xl font-extrabold text-white font-mono">449</span><span className="text-lg text-white/30 font-medium">kr/mån</span></div>
                    <p className="text-sm text-white/25 mt-2">+ 3 500 kr engångsavgift (setup & onboarding)</p>
                  </div>
                  <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-xl px-8 py-6 font-semibold shadow-2xl shadow-violet-600/25 border-0 shrink-0">
                    <Link to="/kontakt">Kom igång nu <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {['Obegränsat antal uppdrag', 'GPS & realtidsspårning', 'Kundportal med chatt', 'Automatisk fakturering', 'Statistik & rapporter', 'Förarapp (PWA)', 'Kalender & planeringsvy', 'Support på svenska'].map(item => (
                    <div key={item} className="flex items-center gap-2.5 py-2"><div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-violet-400" /></div><span className="text-sm text-white/50">{item}</span></div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-white/20">Ingen bindningstid. Avsluta när du vill.</p>
                  <button onClick={handleDemo} disabled={demoLoading} className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5"><Play className="h-3.5 w-3.5" /> Testa demo först</button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center mb-12">
              <Star className="h-5 w-5 text-amber-400 inline-block mr-2 -mt-1" />Vad våra kunder säger
            </motion.h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { text: 'Vi testade Coredination och andra — Aurora var det enda som faktiskt passade ett litet transportbolag.', name: 'Anders P.', role: 'VD, Pålssons Transport', initials: 'AP' },
                { text: 'Kundportalen gör att kunderna slutat ringa och fråga var leveransen är. Bara det är värt pengarna.', name: 'Linda M.', role: 'Transportledare, Express Logistik', initials: 'LM' },
              ].map((q, i) => (
                <motion.div key={i} custom={i + 1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7 hover:border-white/[0.08] transition-colors">
                  <p className="text-white/50 mb-5 leading-relaxed italic">"{q.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600/30 to-violet-400/10 flex items-center justify-center text-violet-400 font-bold text-sm border border-violet-500/20">{q.initials}</div>
                    <div><p className="font-semibold text-white/70 text-sm">{q.name}</p><p className="text-xs text-white/25">{q.role}</p></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 relative">
          <div className="absolute inset-0 pointer-events-none"><div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full" /></div>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold mb-6 leading-tight">
              Redo att samla allt{' '}<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">i ett system?</span>
            </motion.h2>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-white/30 mb-8 text-lg">449 kr/mån. Fast pris. Alla funktioner. Igång på 5 minuter.</motion.p>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
              <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-xl px-10 py-6 text-lg font-semibold shadow-2xl shadow-violet-600/25 border-0">
                <Link to="/kontakt">Kom igång nu<ArrowRight className="h-5 w-5 ml-2" /></Link>
              </Button>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-white/[0.04] py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-white/20" /><span className="text-sm text-white/30">Aurora Transport</span><span className="text-xs text-white/15">· Aurora Media AB · 559272-0220</span></div>
            <div className="flex gap-4 text-xs text-white/20">
              <Link to="/" className="hover:text-white/40 transition-colors">Hem</Link>
              <Link to="/privacy" className="hover:text-white/40 transition-colors">Integritetspolicy</Link>
              <a href="mailto:info@auroramedia.se" className="hover:text-white/40 transition-colors">Kontakt</a>
            </div>
          </div>
        </footer>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Aurora Transport',
        applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
        description: 'Transportledningssystem med uppdragsplanering, GPS-spårning, kundportal och fakturering.',
        offers: { '@type': 'Offer', price: '449', priceCurrency: 'SEK' },
      })}} />
    </div>
  );
}

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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow"><Truck className="h-4 w-4 text-white" /></div>
          <span className="font-bold text-white/90 tracking-tight">Aurora Transport</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onDemo} disabled={demoLoading} className="hidden sm:inline-flex text-white/60 hover:text-white hover:bg-white/5 gap-1.5"><Play className="h-3.5 w-3.5" />{demoLoading ? 'Laddar...' : 'Live-demo'}</Button>
          <Button size="sm" asChild className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30 transition-all"><Link to="/kontakt">Kom igång</Link></Button>
        </div>
      </div>
    </nav>
  );
}
