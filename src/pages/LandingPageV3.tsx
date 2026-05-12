import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Menu,
  PackageCheck,
  Route,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Truck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LeadFormModal } from '@/components/LeadFormModal';
import { DemoBookingModal } from '@/components/DemoBookingModal';
import { useAuth } from '@/hooks/useAuth';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';
import { useHreflang } from '@/lib/use-hreflang';
import { landingCopy, type Lang } from '@/i18n/landing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.06, ease: 'easeOut' as const },
  }),
};

const valueIcons = [TimerReset, ShieldCheck, Wallet];
const stepIcons = [FileText, Users, Truck, Clock, PackageCheck];
const featureIcons = [Route, Users, BarChart3];
const audienceIcons = [Truck, Zap, Users];

export default function LandingPageV3() {
  const auth = useAuth();
  const { user, role } = auth;
  const isPlatformAdmin = auth.isPlatformAdmin;
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const lang: Lang = location.pathname.startsWith('/en') ? 'en' : 'sv';
  const t = landingCopy[lang];
  const canonical = lang === 'en' ? t.hreflang.en : t.hreflang.sv;
  const otherLang: Lang = lang === 'sv' ? 'en' : 'sv';
  const otherPath = otherLang === 'en' ? '/en' : '/';

  useBreadcrumbJsonLd(useMemo(() => [{ name: t.nav.breadcrumbHome, url: canonical }], [t, canonical]));
  usePageMeta({
    title: t.meta.title,
    description: t.meta.description,
    canonical,
    ogImage: 'https://auroratransport.se/og-image.png',
  });
  useHreflang(useMemo(() => ({ sv: t.hreflang.sv, en: t.hreflang.en }), [t]), t.htmlLang);

  useEffect(() => {
    if (theme !== 'light') setTheme('light');
  }, [theme, setTheme]);

  useEffect(() => {
    if (location.pathname === '/boka' || location.pathname === '/en/book') {
      setDemoModalOpen(true);
    }
  }, [location.pathname]);

  const dashboardHref = user ? (isPlatformAdmin ? '/platform' : role === 'driver' ? '/driver' : '/admin') : '/login';
  const dashboardLabel = user ? t.nav.dashboard : t.nav.login;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login', { body: { type: 'akeri' } });
      if (error || !data?.email) throw new Error(data?.error || t.toasts.demoError);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) throw signInError;

      toast.success(t.toasts.demoSuccess(data.companyName));
      setTimeout(() => navigate('/admin'), 500);
    } catch (err: any) {
      toast.error(err.message || t.toasts.demoError);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to={lang === 'en' ? '/en' : '/'} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f2f6e] shadow-lg shadow-blue-900/15">
              <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold tracking-tight sm:text-base">Aurora Transport</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <button onClick={() => scrollTo('funktioner')} className="transition hover:text-slate-950">{t.nav.features}</button>
            <button onClick={() => scrollTo('flode')} className="transition hover:text-slate-950">{t.nav.flow}</button>
            <button onClick={() => scrollTo('pris')} className="transition hover:text-slate-950">{t.nav.pricing}</button>
            <button onClick={() => scrollTo('faq')} className="transition hover:text-slate-950">{t.nav.faq}</button>
          </nav>

          <div className="flex items-center gap-2">
            <Link to={otherPath} hrefLang={otherLang} aria-label={t.langSwitch.aria} className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex">
              <Globe className="h-3.5 w-3.5" />
              <span className={lang === 'sv' ? 'text-slate-950' : 'text-slate-400'}>{t.langSwitch.sv}</span>
              <span className="text-slate-300">/</span>
              <span className={lang === 'en' ? 'text-slate-950' : 'text-slate-400'}>{t.langSwitch.en}</span>
            </Link>
            <Button asChild variant="ghost" size="sm" className="hidden text-slate-700 hover:text-slate-950 sm:inline-flex">
              <Link to={dashboardHref}>{dashboardLabel}</Link>
            </Button>
            <Button size="sm" onClick={() => setDemoModalOpen(true)} className="hidden rounded-xl bg-[#123b88] px-4 font-bold text-white hover:bg-[#0f2f6e] md:inline-flex">
              {t.nav.bookDemo}
            </Button>
            <Button variant="outline" size="icon" className="md:hidden" aria-label={t.nav.menu}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_15%_10%,rgba(18,59,136,0.16),transparent_32rem),linear-gradient(180deg,#eef5ff_0%,#f8fafc_58%,#ffffff_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,47,110,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,47,110,0.055)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.98fr_1.02fr] lg:px-8 lg:py-24">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/15 bg-white/85 px-3 py-1.5 text-xs font-bold text-[#123b88] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {t.hero.badge}
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-[-0.03em] text-slate-950 [hyphens:auto] [overflow-wrap:break-word] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.02] xl:text-6xl xl:leading-[0.98]" lang="sv">
                {t.hero.h1}
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                {t.hero.sub}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => setDemoModalOpen(true)} className="h-13 rounded-2xl bg-[#123b88] px-7 text-base font-bold text-white shadow-xl shadow-blue-900/20 hover:bg-[#0f2f6e]">
                  {t.hero.ctaPrimary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleDemo} disabled={demoLoading} className="h-13 rounded-2xl border-slate-300 bg-white px-7 text-base font-bold text-slate-950 hover:bg-slate-50">
                  {demoLoading ? t.hero.ctaSecondaryLoading : t.hero.ctaSecondaryIdle}
                </Button>
              </div>

              <div className="mt-8 grid gap-3 text-sm font-medium text-slate-600 sm:grid-cols-2">
                {t.hero.trustPoints.map((point) => (
                  <div key={point} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#123b88]" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}>
              <HeroProductMockup />
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              {t.values.map((card, index) => {
                const Icon = valueIcons[index] ?? TimerReset;
                return (
                  <motion.div key={card.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={index} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#123b88]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">{card.title}</h2>
                    <p className="mt-3 leading-7 text-slate-600">{card.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fc] py-18 sm:py-22">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">

        <IncludedSection lang={lang} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={0}>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#123b88]">{t.seoIntro.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t.seoIntro.h2}</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={1} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_80px_rgba(15,23,42,0.06)]">
              <p className="text-lg leading-8 text-slate-600">{t.seoIntro.text}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {t.seoIntro.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-2xl bg-[#eef5ff] px-4 py-3 text-sm font-bold text-[#123b88]">
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section id="flode" className="border-y border-slate-200 bg-slate-950 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">{t.flow.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{t.flow.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">{t.flow.sub}</p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-5">
              {t.flow.steps.map((step, index) => {
                const Icon = stepIcons[index] ?? FileText;
                return (
                  <motion.div key={step.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={index} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-500">{step.label}</span>
                    </div>
                    <h3 className="mt-5 font-black tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="funktioner" className="bg-[#f7f9fc] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#123b88]">{t.features.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t.features.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{t.features.sub}</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {t.features.groups.map((group, index) => {
                const Icon = featureIcons[index] ?? Route;
                return (
                  <motion.div key={group.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={index} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_80px_rgba(15,23,42,0.06)]">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#123b88] text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{group.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{group.text}</p>
                    <ul className="mt-6 space-y-3">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                          <Check className="h-4 w-4 text-[#123b88]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#123b88]">{t.audiences.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t.audiences.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{t.audiences.sub}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {t.audiences.items.map((item, index) => {
                const Icon = audienceIcons[index] ?? Truck;
                return (
                  <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#123b88] shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-950">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pris" className="relative overflow-hidden bg-[#eef5ff] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#123b88]">{t.pricing.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t.pricing.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{t.pricing.sub}</p>
            </div>
            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t.pricing.setupLabel}</p>
                <div className="mt-4 text-5xl font-black tracking-tight text-slate-950">{t.pricing.setupPrice}</div>
                <p className="mt-3 leading-7 text-slate-600">{t.pricing.setupText}</p>
              </div>
              <div className="relative overflow-hidden rounded-[2rem] bg-[#0b1730] p-8 text-white shadow-[0_30px_90px_rgba(15,47,110,0.28)]">
                <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-blue-500/30 blur-3xl" />
                <div className="relative">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">{t.pricing.monthlyLabel}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-6xl font-black tracking-tight">{t.pricing.monthlyPrice}</span>
                    <span className="pb-2 text-lg font-semibold text-slate-300">{t.pricing.monthlyUnit}</span>
                  </div>
                  <p className="mt-4 leading-7 text-slate-300">{t.pricing.monthlyText}</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {t.pricing.monthlyBenefits.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-blue-300" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <Button size="lg" onClick={() => setDemoModalOpen(true)} className="mt-8 rounded-2xl bg-white px-7 font-black text-[#0b1730] hover:bg-blue-50">
                    {t.pricing.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#123b88]">{t.faq.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t.faq.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{t.faq.sub}</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {t.faq.items.map((item, index) => (
                <AccordionItem key={item.q} value={`item-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-5">
                  <AccordionTrigger className="text-left font-black text-slate-950 hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="leading-7 text-slate-600">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/20 sm:p-12">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">{t.finalCta.h2}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">{t.finalCta.sub}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => setDemoModalOpen(true)} className="rounded-2xl bg-white px-7 font-black text-slate-950 hover:bg-blue-50">
                {t.finalCta.primary}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleDemo} disabled={demoLoading} className="rounded-2xl border-white/20 bg-transparent px-7 font-black text-white hover:bg-white/10 hover:text-white">
                {demoLoading ? t.finalCta.secondaryLoading : t.finalCta.secondaryIdle}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LeadFormModal open={leadModalOpen} onOpenChange={setLeadModalOpen} />
      <DemoBookingModal open={demoModalOpen} onOpenChange={setDemoModalOpen} lang={lang} />
    </div>
  );
}

function HeroProductMockup() {
  return (
    <div className="relative mx-auto max-w-2xl lg:max-w-none">
      <div className="absolute inset-6 rounded-[2rem] bg-blue-900/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,47,110,0.18)]">
        <div className="flex h-12 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <div className="ml-3 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-400">app.auroratransport.se</div>
        </div>
        <div className="grid min-h-[430px] grid-cols-[170px_1fr]">
          <aside className="hidden bg-[#0b1730] p-5 text-white sm:block">
            <div className="flex items-center gap-2 font-black">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500"><Truck className="h-4 w-4" /></div>
              Aurora Transport
            </div>
            <div className="mt-8 space-y-2 text-sm text-slate-300">
              {['Översikt', 'Uppdrag', 'Förare', 'Tidrapport', 'Rapporter'].map((item, index) => (
                <div key={item} className={`rounded-xl px-3 py-2 ${index === 0 ? 'bg-white/10 text-white' : ''}`}>{item}</div>
              ))}
            </div>
          </aside>
          <div className="p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric icon={PackageCheck} value="12" label="Pågående uppdrag" tone="blue" />
              <Metric icon={Users} value="8" label="Tilldelade förare" tone="green" />
              <Metric icon={Clock} value="6" label="Rapporter idag" tone="amber" />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Aktuellt uppdrag</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">Pågående</span>
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">Göteborg → Stockholm</h3>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>Upphämtning 08:30</p>
                  <p>Kund: Nilsson Åkeri AB</p>
                  <p>Förare: Johan Svensson</p>
                </div>
                <button className="mt-5 rounded-xl bg-[#123b88] px-4 py-2.5 text-sm font-black text-white">Markera som slutförd</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#eef5ff] p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live-rutt</p>
                <div className="relative mt-5 h-48 overflow-hidden rounded-2xl bg-white">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,59,136,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(18,59,136,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
                  <div className="absolute bottom-6 left-8 h-3 w-3 rounded-full bg-emerald-500" />
                  <div className="absolute right-10 top-8 h-3 w-3 rounded-full bg-[#123b88]" />
                  <div className="absolute bottom-8 left-10 h-32 w-32 rounded-full border-r-2 border-dashed border-[#123b88]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label, tone }: { icon: any; value: string; label: string; tone: 'blue' | 'green' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
    </div>
  );
}
