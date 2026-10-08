import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { HomeHero } from '@/components/HomeHero';
import { HomeReveal } from '@/components/HomeReveal';
import { useAuth } from '@/hooks/useAuth';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { useJsonLd } from '@/lib/use-json-ld';
import { usePageMeta } from '@/lib/use-page-meta';
import { useHreflang } from '@/lib/use-hreflang';
import { landingCopy, type Lang } from '@/i18n/landing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LeadFormModal = lazy(() => import('@/components/LeadFormModal').then(module => ({ default: module.LeadFormModal })));
const DemoBookingModal = lazy(() => import('@/components/DemoBookingModal').then(module => ({ default: module.DemoBookingModal })));
const RoiCalculator = lazy(() => import('@/components/RoiCalculator').then(module => ({ default: module.RoiCalculator })));

export default function LandingPageV3() {
  const auth = useAuth();
  const { user, role } = auth;
  const isPlatformAdmin = auth.isPlatformAdmin;
  const navigate = useNavigate();
  const location = useLocation();
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [roiOpen, setRoiOpen] = useState(false);

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
    if (location.pathname === '/en/book') {
      setDemoModalOpen(true);
    }
  }, [location.pathname]);

  const dashboardHref = user ? (isPlatformAdmin ? '/platform' : role === 'driver' ? '/driver' : '/admin') : '/login';
  const dashboardLabel = user ? t.nav.dashboard : t.nav.login;

  const copy = (sv: string, en: string) => lang === 'en' ? en : sv;

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toasts.demoError);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="home-page home-transport">
      <header className="home-header">
        <div className="home-container home-header-row">
          <Link to={lang === 'en' ? '/en' : '/'} className="home-brand">Aurora Transport</Link>
          <nav className="home-desktop-nav" aria-label={copy('Huvudmeny', 'Main navigation')}>
            <a href="#funktioner">{t.nav.features}</a><a href="#flode">{copy('Kom igång', 'Get started')}</a><a href="#pris">{t.nav.pricing}</a>
          </nav>
          <div className="home-header-actions">
            <Link to={otherPath} hrefLang={otherLang} aria-label={`${otherLang.toUpperCase()} – ${t.langSwitch.aria}`}>{otherLang.toUpperCase()}</Link>
            <Link to={dashboardHref}>{dashboardLabel}</Link>
            <button className="home-button" onClick={() => setDemoModalOpen(true)}>{copy('Boka demo', 'Book a demo')}</button>
          </div>
          <Sheet>
            <SheetTrigger asChild><button className="home-menu-trigger" aria-label={copy('Öppna meny', 'Open menu')}>{copy('Meny', 'Menu')}</button></SheetTrigger>
            <SheetContent side="right" className="home-mobile-menu w-[min(360px,100vw)]">
              <SheetHeader><SheetTitle>{t.nav.menu}</SheetTitle></SheetHeader>
              <nav aria-label={copy('Mobilmeny', 'Mobile navigation')}>
                {[[t.nav.features, 'funktioner'], [copy('Kom igång', 'Get started'), 'flode'], [t.nav.pricing, 'pris'], [t.nav.faq, 'faq']].map(([label, id]) => <SheetClose asChild key={id}><a href={`#${id}`}>{label}</a></SheetClose>)}
                <SheetClose asChild><Link to={dashboardHref}>{dashboardLabel}</Link></SheetClose>
                <SheetClose asChild><Link to={otherPath} hrefLang={otherLang}>{copy('English', 'Svenska')}</Link></SheetClose>
                <SheetClose asChild><button onClick={() => setDemoModalOpen(true)}>{copy('Boka demo', 'Book a demo')}</button></SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="home-main">
        <HomeHero lang={lang}>
          <button className="home-button home-button-light" onClick={() => setDemoModalOpen(true)}>{copy('Boka en demo på 15 minuter', 'Book a 15-minute demo')} <span aria-hidden="true">↗</span></button>
        </HomeHero>

        <div className="home-container home-stats">
          <div className="home-stat"><strong>{copy('449 kr/mån', 'SEK 449/month')}</strong><span>{copy('Exkl. moms · Samma pris oavsett antal förare', 'Excl. VAT · Same price, any number of drivers')}</span></div>
          <div className="home-stat"><strong>{copy('Obegränsat', 'Unlimited')}</strong><span>{copy('Antal förare', 'Number of drivers')}</span></div>
          <div className="home-stat"><strong>{copy('Ingen bindningstid', 'No lock-in')}</strong><span>{copy('Sluta när du vill', 'Cancel whenever you want')}</span></div>
        </div>

        <section className="home-section">
          <HomeReveal className="home-container">
            <h2 className="home-section-heading">{copy('Hur ser din måndag ut?', 'What does your Monday look like?')}</h2>
            <div className="home-before-after">
              <div className="home-comparison"><h3>{copy('Före', 'Before')}</h3><p>{copy('Körordern i ett Excel-ark. Ändringarna i WhatsApp. Whiteboarden som ingen har fotat. Tidlappar som ska tydas på fredag.', 'The job in an Excel sheet. Changes on WhatsApp. The whiteboard nobody photographed. Timesheets to decipher on Friday.')}</p></div>
              <div className="home-comparison home-after"><h3>{copy('Efter', 'After')}</h3><p>{copy('Uppdragen ligger på ett ställe. Förarna ser sina jobb. Tiderna är redan inlagda. Underlaget till fakturan är klart.', 'The assignments are in one place. Drivers see their jobs. Hours are already entered. The invoice records are ready.')}</p></div>
            </div>
          </HomeReveal>
        </section>

        <section id="funktioner" className="home-section home-soft">
          <HomeReveal className="home-container">
            <h2 className="home-section-heading">{copy('Det du behöver. Inget mer.', 'What you need. Nothing more.')}</h2>
            <div id="ingar" className="home-grid home-features">
              {[
                [copy('Uppdrag', 'Assignments'), copy('Lägg in körningar och fördela dem på förarna.', 'Add jobs and assign them to drivers.')],
                [copy('Förare', 'Drivers'), copy('Lägg till hur många du vill. Det kostar inget extra.', 'Add as many as you want. There is no extra cost.')],
                [copy('Tidrapporter', 'Time reports'), copy('Samlade och klara när det är dags för lön.', 'All together and ready when payroll is due.')],
                [copy('Fakturaunderlag', 'Invoice records'), copy('Följer med uppdraget, så du slipper leta i efterhand.', 'Stay with the assignment, so you do not have to search later.')],
              ].map(([title, body], index) => <div className="home-card home-feature" key={title}><span className="home-feature-index">0{index + 1}</span><h3>{title}</h3><p>{body}</p></div>)}
            </div>
            <div className="home-audience" aria-label={copy('För åkerier, budfirmor och transportbemanning', 'For hauliers, couriers and transport staffing')}>
              <p>{copy('Gjort för', 'Made for')}</p><span className="home-chip">{copy('Åkerier', 'Hauliers')}</span><span className="home-chip">{copy('Budfirmor', 'Couriers')}</span><span className="home-chip">{copy('Transportbemanning', 'Transport staffing')}</span>
            </div>
          </HomeReveal>
        </section>

        <section id="pris" className="home-section">
          <HomeReveal className="home-container">
            <div className="home-price">
              <p className="home-eyebrow">{copy('Priset', 'The price')}</p><h2>{copy('Ett pris. 449 kr i månaden.', 'One price. SEK 449 a month.')}</h2><small>{copy('Exkl. moms', 'Excluding VAT')}</small><p>{copy('Alla förare ingår. Ingen bindningstid.', 'Every driver included. No lock-in.')}</p>
              <button className="home-button" onClick={() => setDemoModalOpen(true)}>{copy('Boka demo', 'Book a demo')} <span aria-hidden="true">↗</span></button>
            </div>
          </HomeReveal>
        </section>

        <section id="flode" className="home-section" style={{ paddingTop: 0 }}>
          <HomeReveal className="home-container">
            <h2 className="home-section-heading">{copy('Kom igång', 'Get started')}</h2>
            <div className="home-grid home-steps">
              {[
                copy('Boka en demo. Det tar 15 minuter.', 'Book a demo. It takes 15 minutes.'),
                copy('Vi visar hur ni kan komma igång redan i dag.', 'We show you how to get started today.'),
                copy('Lägg in förarna och de första uppdragen.', 'Add your drivers and first assignments.'),
              ].map((step, index) => <div className="home-step" key={step}><span className="home-number">{index + 1}</span><h3>{step}</h3></div>)}
            </div>
          </HomeReveal>
        </section>

        {/* Existing interactive tools, FAQ/schema content and entry points remain available. */}
        <section className="home-section home-existing">
          <div className="home-container">
            <div className="home-existing-actions">
              <button className="home-text-link" onClick={handleDemo} disabled={demoLoading}>{demoLoading ? t.hero.ctaSecondaryLoading : copy('Prova själv i demokontot', 'Try the demo account')}</button>
              <Link className="home-text-link" to="/register">{copy('Skapa konto', 'Create an account')}</Link>
            </div>
            <details className="home-extra" id="roi" onToggle={event => { if (event.currentTarget.open) setRoiOpen(true); }}><summary>{copy('Räkna på er tid', 'Estimate your time')}</summary><div className="home-extra-body"><p className="home-muted">{t.roi.sub}</p><Suspense fallback={<p>{copy('Laddar kalkylatorn…', 'Loading the calculator…')}</p>}>{roiOpen && <RoiCalculator t={t.roi} lang={lang} onCta={() => setDemoModalOpen(true)} />}</Suspense></div></details>
            <details className="home-extra" id="mejla-in-order"><summary>{t.emailOrder.h2}</summary><div className="home-extra-body"><p className="home-muted">{t.emailOrder.sub}</p><div className="home-grid home-steps" style={{ marginTop: 24 }}>{t.emailOrder.steps.map((step, index) => <div className="home-step" key={step.title}><span className="home-number">{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></div></details>
            <details className="home-extra" id="faq"><summary>{t.faq.h2}</summary><div className="home-faq home-extra-body">{t.faq.items.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></details>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-container"><div><Link to={lang === 'en' ? '/en' : '/'} className="home-brand">Aurora Transport</Link><p>{copy('Aurora Transport görs av Aurora Media AB.', 'Aurora Transport is made by Aurora Media AB.')}</p></div><nav aria-label={copy('Sidfot', 'Footer')}><Link to="/kontakt">{copy('Kontakt', 'Contact')}</Link><Link to="/privacy">{copy('Integritetspolicy', 'Privacy policy')}</Link><Link to="/om-oss">{copy('Om oss', 'About us')}</Link><a href="#faq">{copy('Vanliga frågor', 'FAQ')}</a></nav></div>
      </footer>
      <Suspense fallback={<p role="status" className="home-modal-loading">{copy('Öppnar formuläret…', 'Opening the form…')}</p>}>
        {leadModalOpen && <LeadFormModal open={leadModalOpen} onOpenChange={setLeadModalOpen} />}
        {demoModalOpen && <DemoBookingModal open={demoModalOpen} onOpenChange={setDemoModalOpen} lang={lang} />}
      </Suspense>
    </div>
  );
}
