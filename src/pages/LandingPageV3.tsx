import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { ArrowRight, ChartBar as BarChart3, Check, CircleCheck as CheckCircle2, Clock, FileText, Globe, Loader as Loader2, Menu, PackageCheck, Route, ShieldCheck, Sparkles, TimerReset, Truck, Users, Wallet, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LeadFormModal } from '@/components/LeadFormModal';
import { DemoBookingModal } from '@/components/DemoBookingModal';
import { useAuth } from '@/hooks/useAuth';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { useJsonLd } from '@/lib/use-json-ld';
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
  useJsonLd('faqpage', useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }), [t.faq.items]));

  useEffect(() => {
    if (theme !== 'light') setTheme('light');
  }, [theme, setTheme]);

  useEffect(() => {
    if (location.pathname === '/en/book') {
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
    <div className="landing-v3 min-h-screen overflow-x-hidden bg-[#0a0a1a] text-white">
      <header className="sticky top-0 z-50 border-b border-[#1e1e5a]/60 bg-[#0a0a1a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to={lang === 'en' ? '/en' : '/'} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4338ca] shadow-lg shadow-[#4f46e5]/25">
              <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold tracking-tight sm:text-base">Aurora Transport</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-400 md:flex">
            <button onClick={() => scrollTo('funktioner')} className="transition hover:text-white">{t.nav.features}</button>
            <button onClick={() => scrollTo('flode')} className="transition hover:text-white">{t.nav.flow}</button>
            <button onClick={() => scrollTo('pris')} className="transition hover:text-white">{t.nav.pricing}</button>
            <button onClick={() => scrollTo('faq')} className="transition hover:text-white">{t.nav.faq}</button>
          </nav>

          <div className="flex items-center gap-2">
            <Link to={otherPath} hrefLang={otherLang} aria-label={t.langSwitch.aria} className="hidden items-center gap-1.5 rounded-xl border border-[#1e1e5a] bg-[#141432] px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-[#1e1e5a] hover:text-white sm:inline-flex">
              <Globe className="h-3.5 w-3.5" />
              <span className={lang === 'sv' ? 'text-white' : 'text-slate-400'}>{t.langSwitch.sv}</span>
              <span className="text-slate-400">/</span>
              <span className={lang === 'en' ? 'text-white' : 'text-slate-400'}>{t.langSwitch.en}</span>
            </Link>
            <Button asChild variant="ghost" size="sm" className="hidden text-slate-200 hover:text-white sm:inline-flex">
              <Link to={dashboardHref}>{dashboardLabel}</Link>
            </Button>
            <Button size="sm" onClick={() => setDemoModalOpen(true)} className="hidden rounded-xl bg-[#4f46e5] px-4 font-bold text-white hover:bg-[#4338ca] md:inline-flex">
              {t.nav.bookDemo}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label={t.nav.menu}>
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">{t.nav.menu}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1 text-base font-semibold text-slate-200">
                  <SheetClose asChild>
                    <button onClick={() => scrollTo('funktioner')} className="rounded-lg px-3 py-3 text-left hover:bg-[#141432]">{t.nav.features}</button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button onClick={() => scrollTo('flode')} className="rounded-lg px-3 py-3 text-left hover:bg-[#141432]">{t.nav.flow}</button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button onClick={() => scrollTo('pris')} className="rounded-lg px-3 py-3 text-left hover:bg-[#141432]">{t.nav.pricing}</button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button onClick={() => scrollTo('faq')} className="rounded-lg px-3 py-3 text-left hover:bg-[#141432]">{t.nav.faq}</button>
                  </SheetClose>
                </nav>
                <div className="mt-6 flex flex-col gap-2 border-t border-[#1e1e5a] pt-6">
                  <SheetClose asChild>
                    <Button onClick={() => setDemoModalOpen(true)} className="h-11 w-full rounded-xl bg-[#4f46e5] font-bold text-white hover:bg-[#4338ca]">
                      {t.nav.bookDemo}
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="h-11 w-full rounded-xl font-bold">
                      <Link to={dashboardHref}>{dashboardLabel}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to={otherPath} hrefLang={otherLang} className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1e1e5a] bg-[#141432] px-3 py-2 text-xs font-bold text-slate-200">
                      <Globe className="h-3.5 w-3.5" />
                      <span className={lang === 'sv' ? 'text-white' : 'text-slate-400'}>{t.langSwitch.sv}</span>
                      <span className="text-slate-400">/</span>
                      <span className={lang === 'en' ? 'text-white' : 'text-slate-400'}>{t.langSwitch.en}</span>
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#1e1e5a] bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.25),transparent_40rem),linear-gradient(180deg,#0a0a1a_0%,#0a0a1a_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.98fr_1.02fr] lg:px-8 lg:py-24">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="w-full min-w-0 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4f46e5]/30 bg-[#141432]/85 px-3 py-1.5 text-xs font-bold text-[#818cf8] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {t.hero.badge}
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-[-0.03em] text-white [hyphens:auto] [overflow-wrap:break-word] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.02] xl:text-6xl xl:leading-[0.98]" lang="sv">
                {t.hero.h1}
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                {t.hero.sub}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => setDemoModalOpen(true)} className="h-13 rounded-2xl bg-[#4f46e5] px-7 text-base font-bold text-white shadow-xl shadow-[#4f46e5]/30 hover:bg-[#4338ca]">
                  {t.hero.ctaPrimary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleDemo} disabled={demoLoading} className="h-13 rounded-2xl border-[#1e1e5a] bg-[#141432] px-7 text-base font-bold text-white hover:bg-[#141432]">
                  {demoLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.hero.ctaSecondaryLoading}</>
                  ) : t.hero.ctaSecondaryIdle}
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-13 rounded-2xl px-7 text-base font-bold text-[#818cf8] hover:bg-[#4f46e5]/5">
                  <Link to="/register">
                    {t.hero.ctaRegister}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 text-sm font-medium text-slate-400 sm:grid-cols-2">
                {t.hero.trustPoints.map((point) => (
                  <div key={point} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#818cf8]" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }} className="w-full min-w-0">
              <HeroProductMockup />
            </motion.div>
          </div>
        </section>

        <section className="bg-[#141432] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              {t.values.map((card, index) => {
                const Icon = valueIcons[index] ?? TimerReset;
                return (
                  <motion.div key={card.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={index} className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.4)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e1e5a]/20 text-[#818cf8]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-black tracking-tight text-white">{card.title}</h2>
                    <p className="mt-3 leading-7 text-slate-400">{card.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <IncludedSection lang={lang} onDemo={() => setDemoModalOpen(true)} />

        <section className="bg-[#0a0a1a] py-18 sm:py-22">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={0}>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.seoIntro.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{t.seoIntro.h2}</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={1} className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-8 shadow-[0_22px_80px_rgba(0,0,0,0.5)]">
              <p className="text-lg leading-8 text-slate-400">{t.seoIntro.text}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {t.seoIntro.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-2xl bg-[#1e1e5a]/20 px-4 py-3 text-sm font-bold text-[#818cf8]">
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section id="flode" className="border-y border-[#1e1e5a] bg-[#0a0a1a] py-20 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.flow.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{t.flow.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">{t.flow.sub}</p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-5">
              {t.flow.steps.map((step, index) => {
                const Icon = stepIcons[index] ?? FileText;
                return (
                  <motion.div key={step.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={index} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4f46e5]/20 text-[#a5b4fc]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400">{step.label}</span>
                    </div>
                    <h3 className="mt-5 font-black tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="funktioner" className="bg-[#0a0a1a] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.features.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{t.features.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">{t.features.sub}</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {t.features.groups.map((group, index) => {
                const Icon = featureIcons[index] ?? Route;
                return (
                  <motion.div key={group.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} custom={index} className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-8 shadow-[0_22px_80px_rgba(0,0,0,0.5)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4f46e5] text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black tracking-tight text-white">{group.title}</h3>
                    <p className="mt-3 leading-7 text-slate-400">{group.text}</p>
                    <ul className="mt-6 space-y-3">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-200">
                          <Check className="h-4 w-4 text-[#818cf8]" />
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

        <section className="bg-[#141432] py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.audiences.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{t.audiences.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">{t.audiences.sub}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {t.audiences.items.map((item, index) => {
                const Icon = audienceIcons[index] ?? Truck;
                return (
                  <div key={item.title} className="rounded-[1.5rem] border border-[#1e1e5a] bg-[#141432] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#141432] text-[#818cf8] shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pris" className="relative overflow-hidden bg-[#1e1e5a]/20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.pricing.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{t.pricing.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">{t.pricing.sub}</p>
            </div>
            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.4)]">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{t.pricing.setupLabel}</p>
                <div className="mt-4 text-5xl font-black tracking-tight text-white">{t.pricing.setupPrice}</div>
                <p className="mt-3 leading-7 text-slate-400">{t.pricing.setupText}</p>
              </div>
              <div className="relative overflow-hidden rounded-[2rem] bg-[#141432] p-8 text-white shadow-[0_30px_90px_rgba(79,70,229,0.35)]">
                <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[#4f46e5]/40 blur-3xl" />
                <div className="relative">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a5b4fc]">{t.pricing.monthlyLabel}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-6xl font-black tracking-tight">{t.pricing.monthlyPrice}</span>
                    <span className="pb-2 text-lg font-semibold text-slate-400">{t.pricing.monthlyUnit}</span>
                  </div>
                  <p className="mt-4 leading-7 text-slate-400">{t.pricing.monthlyText}</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {t.pricing.monthlyBenefits.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-[#818cf8]" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <Button size="lg" onClick={() => setDemoModalOpen(true)} className="mt-8 rounded-2xl bg-[#4f46e5] px-7 font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.45)] hover:bg-[#4338ca]">
                    {t.pricing.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button asChild size="lg" variant="outline" className="mt-3 rounded-2xl border-white/30 bg-transparent px-7 font-black text-white hover:bg-white/10 hover:text-white">
                    <Link to="/register">
                      {t.pricing.ctaRegister}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#141432] py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.faq.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{t.faq.h2}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">{t.faq.sub}</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {t.faq.items.map((item, index) => (
                <AccordionItem key={item.q} value={`item-${index}`} className="rounded-2xl border border-[#1e1e5a] bg-[#141432] px-5">
                  <AccordionTrigger className="text-left font-black text-white hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="leading-7 text-slate-400">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-[#0a0a1a] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2.2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/20 sm:p-12">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">{t.finalCta.h2}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">{t.finalCta.sub}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => setDemoModalOpen(true)} className="rounded-2xl bg-[#4f46e5] px-7 font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.45)] hover:bg-[#4338ca]">
                {t.finalCta.primary}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleDemo} disabled={demoLoading} className="rounded-2xl border-white/20 bg-transparent px-7 font-black text-white hover:bg-white/10 hover:text-white">
                {demoLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.finalCta.secondaryLoading}</>
                ) : t.finalCta.secondaryIdle}
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-2xl px-7 font-black text-white hover:bg-white/10 hover:text-white">
                <Link to="/register">
                  {t.finalCta.ctaRegister}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
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
    <div className="relative mx-auto w-full min-w-0 max-w-2xl lg:max-w-none">
      <div className="absolute inset-6 rounded-[2rem] bg-[#4f46e5]/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[#1e1e5a] bg-[#141432] shadow-[0_30px_100px_rgba(79,70,229,0.25)]">
        <div className="flex h-12 items-center gap-2 border-b border-[#1e1e5a] bg-[#141432] px-4">
          <span className="h-3 w-3 rounded-full bg-red-500/60" />
          <span className="h-3 w-3 rounded-full bg-amber-500/60" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
          <div className="ml-3 flex-1 rounded-lg border border-[#1e1e5a] bg-[#141432] px-3 py-1.5 font-mono text-xs text-slate-400">app.auroratransport.se</div>
        </div>
        <div className="grid min-h-[430px] grid-cols-1 sm:grid-cols-[170px_1fr]">
          <aside className="hidden bg-[#141432] p-5 text-white sm:block">
            <div className="flex items-center gap-2 font-black">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4f46e5]"><Truck className="h-4 w-4" /></div>
              Aurora Transport
            </div>
            <div className="mt-8 space-y-2 text-sm text-slate-400">
              {['Översikt', 'Uppdrag', 'Förare', 'Tidrapport', 'Rapporter'].map((item, index) => (
                <div key={item} className={`rounded-xl px-3 py-2 ${index === 0 ? 'bg-white/10 text-white' : ''}`}>{item}</div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 p-5 sm:p-7">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <Metric icon={PackageCheck} value="12" label="Pågående uppdrag" tone="blue" />
              <Metric icon={Users} value="8" label="Tilldelade förare" tone="green" />
              <Metric icon={Clock} value="6" label="Rapporter idag" tone="amber" />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-[#1e1e5a] bg-[#141432] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Aktuellt uppdrag</p>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-300">Pågående</span>
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-white">Göteborg → Stockholm</h3>
                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  <p>Upphämtning 08:30</p>
                  <p>Kund: Nilsson Åkeri AB</p>
                  <p>Förare: Johan Svensson</p>
                </div>
                <button className="mt-5 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-black text-white">Markera som slutförd</button>
              </div>
              <div className="rounded-2xl border border-[#1e1e5a] bg-[#1e1e5a]/20 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Live-rutt</p>
                <div className="relative mt-5 h-48 overflow-hidden rounded-2xl bg-[#141432]">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
                  <div className="absolute bottom-6 left-8 h-3 w-3 rounded-full bg-emerald-500/150" />
                  <div className="absolute right-10 top-8 h-3 w-3 rounded-full bg-[#4f46e5]" />
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
    blue: 'bg-[#4f46e5]/15 text-[#a5b4fc]',
    green: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
  };
  return (
    <div className="rounded-2xl border border-[#1e1e5a] bg-[#141432] p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-4 text-3xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
    </div>
  );
}

const includedCopy = {
  sv: {
    eyebrow: 'Detta ingår — exakt vad du får',
    h2: 'Hela transportledningssystemet, ingenting tillagt mot extra avgift',
    sub: 'Ett enda fast pris ger dig hela plattformen: alla moduler, obegränsat antal förare, kunder och uppdrag, support och uppdateringar. Inga tillval, inga paket, inga överraskningar på fakturan.',
    cta: 'Boka demo',
    sub2: 'Logga in i en demomiljö',
    note: 'Allt nedan ingår i 449 kr / månad. 30 dagars uppsägning. Inget år, ingen bindningstid.',
    groups: [
      {
        title: 'Uppdrag & order',
        items: [
          'Skapa, redigera och tilldela uppdrag på sekunder',
          'Återkommande uppdrag och ordermallar',
          'Gruppera uppdrag i ordrar för projekt och perioder',
          'Status i realtid: planerat, pågående, slutfört, fakturerat',
          'Bokningsförfrågningar från kund via formulär eller portal',
          'Tilldela om förare när som helst utan att tappa historik',
        ],
      },
      {
        title: 'Förare & mobil app',
        items: [
          'Mobil förarvy (PWA) — fungerar på iOS och Android utan App Store',
          'Digital tidrapportering direkt i mobilen',
          'Foto- och signaturdokumentation per uppdrag',
          'Avvikelser, väntetid och OB-tillägg via tidsöverlapp',
          'Frånvaro­hantering (sjuk, semester, VAB)',
          'Inbjudan via /join-länk eller direktregistrering',
        ],
      },
      {
        title: 'Kunder & portal',
        items: [
          'Komplett kundregister med pris, betalvillkor och historik',
          'Två prismodeller: fast pris eller timpris per kund',
          'Kundportal med token-länk — chatt, spårning, fakturor',
          'Realtidschatt mellan kund och kontor',
          'Kund kan skicka in bokningsförfrågningar själv',
          'Artikelregister med pris­prioritet (kund → standard → globalt)',
        ],
      },
      {
        title: 'Fakturering & ekonomi',
        items: [
          '4-stegs fakturaguide (full eller underlags-läge för Fortnox)',
          'PDF-fakturor med din logga och dina avtalsuppgifter',
          'Fakturaunderlag direkt från utförda uppdrag',
          'Momsstöd: 0%, 6%, 12%, 25%',
          'Bokföringsexport: SIE (CP437), Fortnox CSV, Visma CSV, Excel',
          'Automatisk konto­mappning för intäkter och moms',
        ],
      },
      {
        title: 'Lön & ersättning',
        items: [
          'Tre lönemodeller: tim, uppdrag eller fast månads­lön',
          'OB beräknas via tids­överlapp mot regler',
          'Trakta­menten och utlägg per uppdrag',
          'Lönesummering per förare och period',
          'Export till lön och bokföring',
          'Underlag som matchar utförda uppdrag — inget dubbelarbete',
        ],
      },
      {
        title: 'GPS, karta & rutt',
        items: [
          'Live-position på förare, uppdaterad var 15:e sekund',
          'Karta byggd på Leaflet / OpenStreetMap (ingen Google-kostnad)',
          'Geofence — automatisk in- och utstämpling vid kund',
          'Ruttoptimering för dagens uppdrag',
          'Kalender­vy: vecka och månad, färgkodad per status',
          'Filtrera på förare, kund, status eller område',
        ],
      },
      {
        title: 'Rapporter & uppföljning',
        items: [
          'KPI-dashboard: omsättning, antal uppdrag, snittpris, marginal',
          'Diagram via Recharts — utveckling över tid',
          'PDF- och Excel-export på alla rapporter',
          'Lönesummerings­rutor per förare och månad',
          'Aktivitetsdashboard: vad som händer just nu',
          'Aviseringar och realtids­uppdateringar i admin',
        ],
      },
      {
        title: 'Säkerhet, support & övrigt',
        items: [
          'Multi-tenant: full isolering mellan företag (RLS)',
          'Roller: Admin och Förare med separata behörigheter',
          'Audit-logg på känsliga åtgärder',
          'Inbyggd backup, kryptering och svensk dataskydd',
          'Modul­hantering — slå av funktioner ni inte använder',
          'Svensk support, svenska språket genom hela appen',
        ],
      },
    ] as { title: string; items: string[] }[],
    notIncluded: {
      title: 'Vad du INTE behöver betala extra för',
      items: [
        'Antal förare — obegränsat ingår',
        'Antal kunder — obegränsat ingår',
        'Antal uppdrag — obegränsat ingår',
        'Uppdateringar och nya funktioner — ingår',
        'Support via mejl — ingår',
        'Bindningstid — ingen, 30 dagars uppsägning',
      ],
    },
  },
  en: {
    eyebrow: 'Exactly what you get',
    h2: 'The full transport management system, nothing locked behind upsells',
    sub: 'One flat price gives you the whole platform: every module, unlimited drivers, customers and jobs, support and updates included. No add-ons, no tiers, no surprises on the invoice.',
    cta: 'Book a demo',
    sub2: 'Try the demo environment',
    note: 'Everything below is included for 449 SEK / month. 30 days notice. No annual contract.',
    groups: [
      {
        title: 'Jobs & orders',
        items: [
          'Create, edit and assign jobs in seconds',
          'Recurring jobs and order templates',
          'Group jobs into orders for projects or periods',
          'Real-time status: planned, in progress, completed, invoiced',
          'Customer booking requests via form or portal',
          'Reassign drivers anytime without losing history',
        ],
      },
      {
        title: 'Drivers & mobile app',
        items: [
          'Mobile driver PWA — works on iOS and Android, no App Store',
          'Digital time reporting directly on the phone',
          'Photo and signature documentation per job',
          'Deviations, waiting time and shift premiums via overlap',
          'Absence management (sick, vacation, leave)',
          'Invite via /join link or direct registration',
        ],
      },
      {
        title: 'Customers & portal',
        items: [
          'Full CRM with pricing, terms and history',
          'Two pricing models: fixed price or hourly per customer',
          'Customer portal with token link — chat, tracking, invoices',
          'Real-time chat between customer and office',
          'Customer can submit booking requests themselves',
          'Article register with price priority (customer → default → global)',
        ],
      },
      {
        title: 'Invoicing & finance',
        items: [
          '4-step invoice wizard (full or basis mode for Fortnox)',
          'PDF invoices with your logo and details',
          'Invoice basis generated directly from completed jobs',
          'VAT support: 0%, 6%, 12%, 25%',
          'Accounting export: SIE (CP437), Fortnox CSV, Visma CSV, Excel',
          'Automatic account mapping for revenue and VAT',
        ],
      },
      {
        title: 'Payroll & compensation',
        items: [
          'Three models: hourly, per job, or fixed monthly',
          'Overtime calculated via shift overlap against rules',
          'Per diem and expenses per job',
          'Payroll summary per driver and period',
          'Export to payroll and accounting systems',
          'Basis matches completed jobs — no double work',
        ],
      },
      {
        title: 'GPS, map & route',
        items: [
          'Live driver position, refreshed every 15 seconds',
          'Map powered by Leaflet / OpenStreetMap (no Google fees)',
          'Geofence — automatic check-in/out at customer site',
          'Route optimization for the day’s jobs',
          'Calendar view: week and month, color coded by status',
          'Filter by driver, customer, status or area',
        ],
      },
      {
        title: 'Reports & analytics',
        items: [
          'KPI dashboard: revenue, jobs, average price, margin',
          'Charts via Recharts — trend over time',
          'PDF and Excel export on every report',
          'Payroll summary cards per driver and month',
          'Live activity dashboard',
          'Notifications and real-time updates in admin',
        ],
      },
      {
        title: 'Security, support & more',
        items: [
          'Multi-tenant: full isolation between companies (RLS)',
          'Roles: Admin and Driver with separate permissions',
          'Audit log on sensitive actions',
          'Built-in backup, encryption and EU data protection',
          'Module management — turn off features you don’t use',
          'Swedish support, Swedish UI throughout',
        ],
      },
    ] as { title: string; items: string[] }[],
    notIncluded: {
      title: 'What you do NOT pay extra for',
      items: [
        'Number of drivers — unlimited included',
        'Number of customers — unlimited included',
        'Number of jobs — unlimited included',
        'Updates and new features — included',
        'Email support — included',
        'Lock-in — none, 30 days notice',
      ],
    },
  },
} as const;

function IncludedSection({ lang, onDemo }: { lang: Lang; onDemo: () => void }) {
  const c = includedCopy[lang];
  return (
    <section id="ingar" className="bg-[#141432] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{c.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl" lang={lang}>
            {c.h2}
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">{c.sub}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {c.groups.map((group, index) => (
            <motion.div
              key={group.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              custom={index}
              className="flex h-full flex-col rounded-[1.75rem] border border-[#1e1e5a] bg-[#0a0a1a] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
            >
              <h3 className="text-lg font-black tracking-tight text-white">{group.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#818cf8]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-7">
            <h3 className="text-xl font-black tracking-tight text-emerald-300">{c.notIncluded.title}</h3>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {c.notIncluded.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-between rounded-[2rem] bg-[#141432] p-7 text-white shadow-[0_30px_90px_rgba(79,70,229,0.35)]">
            <p className="text-sm leading-7 text-slate-400">{c.note}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={onDemo} size="lg" className="rounded-2xl bg-[#4f46e5] px-6 font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:bg-[#4338ca]">
                {c.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/20 bg-transparent px-6 font-black text-white hover:bg-white/10 hover:text-white">
                <a href="#pris">{c.sub2}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
