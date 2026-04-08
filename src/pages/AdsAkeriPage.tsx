import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Truck, Clock, MapPin, Smartphone, Zap, FileText,
  Check, Play, Shield, ArrowRight, Users, BarChart3,
  Car, Star, ChevronRight, Wrench,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
      '0 0 20px rgba(16,185,129,0.15)',
      '0 0 40px rgba(16,185,129,0.25)',
      '0 0 20px rgba(16,185,129,0.15)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

export default function AdsAkeriPage() {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  usePageMeta({
    title: 'Åkerisystem — Digital transportledning för åkerier | Aurora',
    description: 'Komplett åkerisystem med fordonshantering, förarschema, GPS-spårning och fakturering. Digitalisera ditt åkeri idag. 449 kr/mån.',
    canonical: 'https://auroratransport.se/ads/akeri',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Åkerisystem', url: 'https://auroratransport.se/ads/akeri' },
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
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/8 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-green-400/5 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* TOP BAR */}
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
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-sm font-medium text-emerald-400 mb-6 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    För åkerier & transportföretag
                  </span>
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
                  Ditt åkeri,{' '}
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
                    digitalt.
                  </span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-lg sm:text-xl text-white/50 leading-relaxed mb-8 max-w-lg">
                  Sluta jonglera med Excel och whiteboards. Hantera fordon, förare och uppdrag — allt i ett system.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Button size="lg" asChild className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl px-8 py-6 text-base font-semibold shadow-2xl shadow-emerald-600/25 hover:shadow-emerald-500/40 transition-all duration-300 border-0">
                    <Link to="/kontakt">Kom igång — 449 kr/mån<ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                  <Button variant="outline" size="lg" className="rounded-xl px-6 py-6 text-base gap-2 bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition-all" onClick={handleDemo} disabled={demoLoading}>
                    {demoLoading ? <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full" /> Laddar...</span> : <><Play className="h-4 w-4" /> Testa live-demo</>}
                  </Button>
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-white/25">Ingen registrering krävs för demo. Ingen bindningstid.</motion.p>
              </motion.div>

              {/* Hero visual */}
              <motion.div initial={{ opacity: 0, x: 40, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 1 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:block">
                <motion.div {...glowPulse} className="relative">
                  <div className="bg-gradient-to-br from-[#0d1225] to-[#0a0f1e] rounded-2xl border border-white/[0.06] p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-xs text-white/40 font-mono">FORDONSÖVERSIKT</span></div>
                      <span className="text-xs text-white/30 font-mono">3 aktiva</span>
                    </div>
                    {[
                      { reg: 'ABC 123', driver: 'Erik L.', status: 'I trafik', statusColor: 'bg-green-400', route: 'Sthlm → Gbg' },
                      { reg: 'DEF 456', driver: 'Anna K.', status: 'På väg', statusColor: 'bg-blue-400', route: 'Malmö → Lund' },
                      { reg: 'GHI 789', driver: 'Johan S.', status: 'Ledig', statusColor: 'bg-amber-400', route: 'Depå' },
                    ].map((v, i) => (
                      <motion.div key={v.reg} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.15 }} className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"><Car className="h-4 w-4 text-emerald-400/70" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm"><span className="text-white/70 font-medium font-mono">{v.reg}</span><span className="text-white/25">·</span><span className="text-white/40 truncate">{v.driver}</span></div>
                          <span className="text-xs text-white/25">{v.route}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0"><span className={`h-1.5 w-1.5 rounded-full ${v.statusColor}`} /><span className="text-xs text-white/40">{v.status}</span></div>
                      </motion.div>
                    ))}
                    <div className="mt-5 pt-4 border-t border-white/[0.04] grid grid-cols-3 gap-4">
                      {[{ label: 'Fordon', value: '12' }, { label: 'Förare', value: '18' }, { label: 'I trafik', value: '8' }].map(s => (
                        <div key={s.label} className="text-center"><p className="text-lg font-bold text-white/80 font-mono">{s.value}</p><p className="text-[10px] text-white/25 uppercase tracking-wider">{s.label}</p></div>
                      ))}
                    </div>
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
              {['Ingen bindningstid', 'Obegränsat antal fordon', 'Fordonsregister & service', 'Support på svenska'].map(item => (
                <span key={item} className="flex items-center gap-2 text-sm text-white/30"><span className="h-1 w-1 rounded-full bg-emerald-400" />{item}</span>
              ))}
            </div>
          </div>
        </div>

        {/* PAIN POINTS */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-center mb-4">Känns det här bekant?</motion.h2>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-center text-white/30 mb-16 max-w-md mx-auto">De flesta åkerier kämpar fortfarande med manuella processer.</motion.p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { emoji: '📋', title: 'Whiteboards & lappar', desc: 'Uppdrag skrivs på tavlan. Ingen historik, ingen spårbarhet.' },
                { emoji: '🔧', title: 'Servicekaos', desc: 'Ingen koll på besiktning, däckbyten eller serviceintervall per fordon.' },
                { emoji: '💸', title: 'Fakturering tar dagar', desc: 'Underlag samlas ihop manuellt från förare. Fel varje gång.' },
              ].map((p, i) => (
                <motion.div key={p.title} custom={i + 1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative group">
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
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-sm font-medium text-emerald-400 mb-4">Allt du behöver</span>
            </motion.div>
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-center mb-16">Byggt för åkerier.</motion.h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Car, title: 'Fordonsregister', desc: 'Alla fordon med reg.nr, typ, modell och servicehistorik.', color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/10' },
                { icon: Users, title: 'Förarhantering', desc: 'Lägg till förare, tilldela fordon och hantera frånvaro.', color: 'from-teal-500/20 to-teal-600/5 border-teal-500/10' },
                { icon: MapPin, title: 'GPS & Live-karta', desc: 'Se var alla fordon befinner sig. Historik för varje tur.', color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/10' },
                { icon: Zap, title: 'Dispatch i realtid', desc: 'Skapa och tilldela uppdrag. Föraren ser det direkt i mobilen.', color: 'from-violet-500/20 to-violet-600/5 border-violet-500/10' },
                { icon: Clock, title: 'Tidrapportering', desc: 'Automatisk in/ut-stämpling. OB-tillägg beräknas automatiskt.', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/10' },
                { icon: FileText, title: 'Fakturering', desc: 'Generera fakturor från slutförda uppdrag med ett klick.', color: 'from-rose-500/20 to-rose-600/5 border-rose-500/10' },
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
              <p className="text-white/30">Inga dolda avgifter. Ingen per-fordon-kostnad.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/10 to-transparent rounded-3xl blur-xl" />
              <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-3xl p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-4">Fast pris</span>
                    <div className="flex items-baseline gap-1"><span className="text-5xl sm:text-6xl font-extrabold text-white font-mono">449</span><span className="text-lg text-white/30 font-medium">kr/mån</span></div>
                    <p className="text-sm text-white/25 mt-2">+ 3 500 kr engångsavgift (setup & onboarding)</p>
                  </div>
                  <Button size="lg" asChild className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl px-8 py-6 font-semibold shadow-2xl shadow-emerald-600/25 border-0 shrink-0">
                    <Link to="/kontakt">Kom igång nu <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {['Obegränsat antal fordon', 'GPS & live-karta', 'Förarapp (PWA)', 'Automatisk tidrapportering', 'Fordonsregister & service', 'Fakturering & export', 'OB-tillägg & traktamente', 'Support på svenska'].map(item => (
                    <div key={item} className="flex items-center gap-2.5 py-2"><div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-emerald-400" /></div><span className="text-sm text-white/50">{item}</span></div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-white/20">Ingen bindningstid. Avsluta när du vill.</p>
                  <button onClick={handleDemo} disabled={demoLoading} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"><Play className="h-3.5 w-3.5" /> Testa demo först</button>
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
                { text: 'Vi gick från whiteboard till digitalt på en vecka. Nu har vi full koll på alla fordon och förare.', name: 'Magnus T.', role: 'Åkeriägare, Turesson Transport', initials: 'MT' },
                { text: 'GPS-spårningen och automatiska tidrapporterna sparar oss timmar varje vecka.', name: 'Sara B.', role: 'Transportledare', initials: 'SB' },
              ].map((q, i) => (
                <motion.div key={i} custom={i + 1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7 hover:border-white/[0.08] transition-colors">
                  <p className="text-white/50 mb-5 leading-relaxed italic">"{q.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600/30 to-emerald-400/10 flex items-center justify-center text-emerald-400 font-bold text-sm border border-emerald-500/20">{q.initials}</div>
                    <div><p className="font-semibold text-white/70 text-sm">{q.name}</p><p className="text-xs text-white/25">{q.role}</p></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 relative">
          <div className="absolute inset-0 pointer-events-none"><div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full" /></div>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold mb-6 leading-tight">
              Redo att digitalisera{' '}<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">ditt åkeri?</span>
            </motion.h2>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="text-white/30 mb-8 text-lg">449 kr/mån. Fast pris. Alla funktioner. Igång på 5 minuter.</motion.p>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
              <Button size="lg" asChild className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl px-10 py-6 text-lg font-semibold shadow-2xl shadow-emerald-600/25 border-0">
                <Link to="/kontakt">Kom igång nu<ArrowRight className="h-5 w-5 ml-2" /></Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
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
        description: 'Åkerisystem med fordonshantering, GPS-spårning och automatisk tidrapportering.',
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow"><Truck className="h-4 w-4 text-white" /></div>
          <span className="font-bold text-white/90 tracking-tight">Aurora Transport</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onDemo} disabled={demoLoading} className="hidden sm:inline-flex text-white/60 hover:text-white hover:bg-white/5 gap-1.5"><Play className="h-3.5 w-3.5" />{demoLoading ? 'Laddar...' : 'Live-demo'}</Button>
          <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all"><Link to="/kontakt">Kom igång</Link></Button>
        </div>
      </div>
    </nav>
  );
}
