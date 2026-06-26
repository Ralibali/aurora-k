import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { usePageMeta } from '@/lib/use-page-meta';
import { Button } from '@/components/ui/button';
import { Truck, Clock, Users, MapPin, Zap, FileText, MessageSquare, FileSpreadsheet, Phone, Check, X, ChartBar as BarChart3, Route, Bell, Package, Headphones, Wallet, LayoutDashboard, ClipboardList, UserCog, Settings, Search, Plus, ArrowRight, Mail, Shield, Sparkles, Map as MapIcon, CircleCheck as CheckCircle2, Minus, Loader as Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadFormModal } from '@/components/LeadFormModal';
import { track, useScrollDepthTracking } from '@/lib/track';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export default function LandingPage() {
  const auth = useAuth();
  const { user, role } = auth;
  const isPlatformAdmin = auth.isPlatformAdmin;

  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);

  useScrollDepthTracking('landing');

  const openLead = (source: string) => {
    track('cta_click', { cta: 'book_demo', source });
    setLeadModalOpen(true);
  };

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
  ], []));
  usePageMeta({
    title: 'Slipp Excel & WhatsApp i transportplaneringen | Aurora Transport',
    description: 'Aurora Transport samlar uppdrag, förare, tidrapporter och fakturering i ett enkelt svenskt system. 449 kr/mån. Ingen bindningstid. Boka 15 min demo.',
    canonical: 'https://auroratransport.se/',
    ogImage: 'https://auroratransport.se/og-image.png',
    ogImageAlt: 'Aurora Transport — transportledningssystem för åkerier',
    ogType: 'website',
  });

  useEffect(() => {
    const id = 'org-jsonld';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Aurora Transport',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: { '@type': 'Offer', price: '449', priceCurrency: 'SEK', priceSpecification: { billingDuration: 'P1M' } },
      description: 'Transportledningssystem för svenska åkerier och budtjänster. Samlar uppdrag, förare, GPS, fakturering och tidrapportering.',
      url: 'https://auroratransport.se',
      publisher: {
        '@type': 'Organization',
        name: 'Aurora Media',
        url: 'https://auroratransport.se',
        logo: 'https://auroratransport.se/aurora-logo.png',
        contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: 'info@auroramedia.se', availableLanguage: 'Swedish' },
      },
    });
    document.head.appendChild(script);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  useEffect(() => {
    if (theme !== 'light') setTheme('light');
  }, [theme, setTheme]);

  const handleDemo = async () => {
    track('cta_click', { cta: 'sample_demo', source: 'hero' });
    setDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login', {
        body: { type: 'akeri' },
      });
      if (error || !data?.email) throw new Error(data?.error || 'Kunde inte skapa demo');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) throw signInError;
      toast.success(`Inloggad som ${data.companyName} — omdirigerar...`);
      track('demo_login_success', {});
      setTimeout(() => navigate('/admin'), 500);
    } catch (err: any) {
      track('demo_login_error', { message: err?.message || 'unknown' });
      toast.error(err.message || 'Demo-inloggning misslyckades');
    } finally {
      setDemoLoading(false);
    }
  };

  const dashboardHref = user
    ? (isPlatformAdmin ? '/platform' : role === 'driver' ? '/driver' : '/admin')
    : '/login';
  const dashboardLabel = user ? 'Gå till dashboard' : 'Logga in';

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleMobileNav = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => scrollTo(id), 120);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover shadow-sm">
              <Truck className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Aurora Transport</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo('tjanster')} className="hover:text-foreground transition-colors">Tjänster</button>
            <button onClick={() => scrollTo('funktioner')} className="hover:text-foreground transition-colors">Funktioner</button>
            <button onClick={() => scrollTo('pris')} className="hover:text-foreground transition-colors">Pris</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm">
              <Link to={dashboardHref}>{dashboardLabel}</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="sm:hidden">
              <Link to={dashboardHref}>Logga in</Link>
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Öppna meny"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Meny</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1 text-base font-medium">
                  <button onClick={() => handleMobileNav('tjanster')} className="rounded-lg px-3 py-3 text-left hover:bg-muted transition-colors">Tjänster</button>
                  <button onClick={() => handleMobileNav('funktioner')} className="rounded-lg px-3 py-3 text-left hover:bg-muted transition-colors">Funktioner</button>
                  <button onClick={() => handleMobileNav('pris')} className="rounded-lg px-3 py-3 text-left hover:bg-muted transition-colors">Pris</button>
                  <button onClick={() => handleMobileNav('faq')} className="rounded-lg px-3 py-3 text-left hover:bg-muted transition-colors">FAQ</button>
                </nav>
                <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
                  <SheetClose asChild>
                    <Button asChild className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                      <Link to={dashboardHref}>{dashboardLabel}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/kontakt">Kontakta oss</Link>
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Soft gradient background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(214_60%_97%)] via-background to-background" />
        <div className="absolute -top-40 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* LEFT */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Byggt i Sverige för åkerier, bud & bemanning
              </div>
              <h1 className="mt-6 text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] [hyphens:auto] break-words">
                Slipp Excel och WhatsApp i <span className="text-primary">transportplaneringen</span>.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
                Aurora Transport samlar uppdrag, förare, tidrapporter och fakturering i ett enkelt system för svenska transportföretag. Kom igång samma dag.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => openLead('hero')}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20 h-12 px-6 text-base"
                >
                  Boka 15 min demo
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDemo}
                  disabled={demoLoading}
                  className="h-12 px-6 text-base"
                >
                  {demoLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loggar in...</>
                  ) : 'Se demo med exempeldata'}
                </Button>
              </div>
              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-muted-foreground max-w-lg">
                {[
                  '449 kr/mån — fast pris',
                  'Ingen bindningstid',
                  'Support på svenska',
                  'Kom igång samma dag',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* RIGHT — Dashboard mockup */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
              <DashboardMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-20 md:py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              De flesta transportföretag förlorar tid på administration varje dag.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: MessageSquare, title: 'Uppdrag i chatten', text: 'Förare missar jobb, information försvinner och WhatsApp-gruppen blir snabbt ett kaos.' },
              { icon: FileSpreadsheet, title: 'Tidrapporter i Excel', text: 'Timmar räknas ihop för hand, fel uppstår och löneunderlag tar onödig tid.' },
              { icon: Phone, title: 'Planering via telefon', text: 'Du ringer runt för att hitta lediga förare och tappar värdefull tid vid varje tilldelning.' },
            ].map((p, i) => (
              <motion.div
                key={p.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-border bg-background p-7 shadow-sm transition-all hover:border-warning/40 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FÖRE / EFTER */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Från manuell planering till full kontroll
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Så här ändras vardagen när du går från Excel & WhatsApp till Aurora Transport.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            {/* FÖRE */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              custom={0}
              className="rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Före Aurora Transport
              </div>
              <ul className="mt-6 space-y-3.5">
                {[
                  'Uppdrag i WhatsApp',
                  'Tidrapporter i Excel',
                  'Förare rings manuellt',
                  'Fakturering kräver dubbelarbete',
                  'Svårt att få överblick',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted shrink-0">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* EFTER */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              custom={1}
              className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-7 shadow-md"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Efter Aurora Transport
              </div>
              <ul className="mt-6 space-y-3.5">
                {[
                  'Uppdrag samlade på ett ställe',
                  'Förare får jobbet i mobilen',
                  'Tidrapporter samlas automatiskt',
                  'Fakturaunderlag skapas snabbare',
                  'Full kontroll på verksamheten',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DEMO-FLOW — 5 STEG */}
      <section className="py-20 md:py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Så fungerar Aurora Transport på 5 minuter
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Från första uppdrag till färdigt fakturaunderlag — utan extra steg.
            </p>
          </div>
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="grid gap-4 md:grid-cols-5">
              {[
                { n: '1', title: 'Skapa uppdrag', text: 'Lägg in kund, adress och tid på under en minut.', icon: Plus },
                { n: '2', title: 'Tilldela förare', text: 'Välj rätt person — föraren notifieras direkt.', icon: Users },
                { n: '3', title: 'Föraren ser jobbet', text: 'All info i mobilen. Inga fler chattmeddelanden.', icon: Phone },
                { n: '4', title: 'Tidrapport skickas in', text: 'Start, stopp och OB beräknas automatiskt.', icon: Clock },
                { n: '5', title: 'Fakturaunderlag skapas', text: 'Klart att skicka eller exportera till Fortnox.', icon: FileText },
              ].map((s, i) => (
                <motion.div
                  key={s.n}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  variants={fadeUp}
                  custom={i}
                  className="relative rounded-2xl border border-border bg-background p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">0{s.n}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground leading-tight">{s.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button
                size="lg"
                onClick={() => openLead("solution")}
                className="bg-primary hover:bg-primary-hover text-primary-foreground h-12 px-6"
              >
                Boka 15 min demo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FUNKTIONER */}
      <section id="funktioner" className="py-20 md:py-24 bg-gradient-to-b from-[hsl(214_60%_97%)] to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Allt du behöver. Inget du inte behöver.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Ett fokuserat verktyg för transportföretag som vill slippa administration.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: 'Jobbdispatch på sekunder', text: 'Skapa och tilldela uppdrag med några klick. Föraren notifieras direkt.' },
              { icon: Clock, title: 'Digital tidrapportering', text: 'Förare stämplar in och ut. Timmar beräknas automatiskt.' },
              { icon: Wallet, title: 'OB-tillägg & traktamente', text: 'Konfigurera OB-schema för kväll, natt och helg samt traktamentsberäkning.' },
              { icon: MapPin, title: 'Realtidsöversikt', text: 'Se var dina förare befinner sig och vilka uppdrag som pågår.' },
              { icon: Users, title: 'Obegränsat antal förare', text: 'Bjud in hela teamet utan extra kostnad per användare.' },
              { icon: FileText, title: 'Fakturaunderlag & Fortnox', text: 'Skapa underlag för fakturering och exportera data smidigt.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SYSTEMET I PRAKTIKEN */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Full kontroll över dina uppdrag
            </h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="mt-12 max-w-6xl mx-auto"
          >
            <AssignmentTableMockup />
          </motion.div>
        </div>
      </section>

      {/* ALLT SOM INGÅR */}
      <section id="tjanster" className="py-20 md:py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Allt som ingår — i ett fast pris.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Medan andra system tar betalt per användare får du allt inkluderat hos oss.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ClipboardList, title: 'Order & Dispatch', items: ['Skapa uppdrag på sekunder', 'Tilldela förare med några klick', 'Återkommande uppdrag', 'Notifiering till förare', 'Aktivitetslogg'] },
              { icon: MapIcon, title: 'Realtid & Karta', items: ['GPS-spårning av förare', 'Live-karta för admin', 'Geofencing', 'Ruttoptimering', 'Statusuppdatering i realtid'] },
              { icon: Clock, title: 'Tidrapportering & Lön', items: ['Digital stämpelklocka', 'OB-schema kväll/natt/helg', 'Traktamente', 'Löneunderlag per förare', 'Export till lön'] },
              { icon: FileText, title: 'Kund & Faktura', items: ['Kundregister med prislistor', 'Fakturaunderlag', 'Fortnox-export', 'Kundportal med token', 'Påminnelser'] },
              { icon: UserCog, title: 'Personal & Fordon', items: ['Förare och underentreprenörer', 'Frånvaro & semester', 'Fordonsregister', 'Behörigheter & roller', 'Inbjudan via mail'] },
              { icon: Package, title: 'Avrapportering & Dokumentation', items: ['Foto vid leverans', 'Digital signatur', 'Avvikelser & kommentarer', 'PDF-rapporter', 'Bokföringsexport (SIE)'] },
            ].map((g, i) => (
              <motion.div
                key={g.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-background p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <g.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{g.title}</h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {g.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PILOTKUND */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-8 md:p-12 max-w-5xl mx-auto shadow-md"
          >
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Begränsat antal platser
                </div>
                <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  Bli pilotkund
                </h2>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  Vi söker några få transportföretag som vill testa Aurora Transport och hjälpa oss göra systemet ännu bättre. Du får extra närhet till teamet och påverkar vad vi bygger härnäst.
                </p>
                <Button
                  size="lg"
                  onClick={() => openLead("features")}
                  className="mt-7 bg-primary hover:bg-primary-hover text-primary-foreground h-12 px-6"
                >
                  Ansök som pilotkund
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-3">
                {[
                  'Setuphjälp ingår',
                  'Personlig onboarding',
                  'Ingen bindningstid',
                  '449 kr/mån — fast pris',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 rounded-xl border border-border bg-background/80 backdrop-blur px-4 py-3 text-sm text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PRIS */}
      <section id="pris" className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-[hsl(214_60%_97%)] to-background" />
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Enkelt pris. Inga överraskningar.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Fast månadskostnad. Inga avgifter per användare. Säg upp när du vill.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Engång */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-border bg-card p-8 shadow-sm flex flex-col"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engång</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight text-foreground">3 500 kr</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Setup & onboarding</p>
              <ul className="mt-7 space-y-3 flex-1">
                {['Personlig onboarding', 'Vi konfigurerar systemet', 'Genomgång med teamet', 'Import av personal', 'Support under uppstart'].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Löpande — featured */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative rounded-3xl bg-gradient-to-br from-primary to-primary-hover p-8 shadow-xl shadow-primary/25 flex flex-col text-primary-foreground"
            >
              <div className="absolute -top-3 right-6 rounded-full bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground shadow-sm">
                Mest populär
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">Löpande</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">449 kr</span>
                <span className="text-base text-primary-foreground/80">/mån</span>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/85">Obegränsat antal användare</p>
              <ul className="mt-7 space-y-3 flex-1">
                {[
                  'Obegränsat antal förare och admins',
                  'Obegränsat antal uppdrag',
                  'Tidrapportering',
                  'Fakturaunderlag',
                  'Statistik & rapporter',
                  'Support på svenska',
                  'Ingen bindningstid',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => openLead("pricing")}
                size="lg"
                className="mt-8 bg-background text-primary hover:bg-background/90 h-12"
              >
                Boka 15 min demo
              </Button>
            </motion.div>
          </div>
          <div className="mt-10 text-center text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Första månaden totalt: 3 949 kr</span> · Därefter 449 kr/mån</p>
          </div>
        </div>
      </section>

      {/* FÖRTROENDE */}
      <section className="py-16 md:py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Svenskt företag. Svensk support. Inga överraskningar.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { icon: Shield, label: 'Aurora Media AB', sub: 'Org.nr 559272-0220' },
                { icon: Headphones, label: 'Support på svenska', sub: 'Mejl & telefon' },
                { icon: MapIcon, label: 'Byggt i Sverige', sub: 'Svensk utveckling' },
                { icon: CheckCircle2, label: 'Ingen bindningstid', sub: 'Säg upp när du vill' },
                { icon: Wallet, label: 'Fast pris 449 kr/mån', sub: 'Oavsett antal förare' },
              ].map((t, i) => (
                <motion.div
                  key={t.label}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  variants={fadeUp}
                  custom={i}
                  className="rounded-xl border border-border bg-background p-5 text-center"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{t.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* JÄMFÖRELSE */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Varför Aurora Transport?</h2>
          </div>
          <div className="mt-12 max-w-5xl mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto -mx-px">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left font-semibold text-foreground px-4 md:px-6 py-4">Funktion</th>
                    <th className="text-center font-semibold text-primary px-3 md:px-6 py-4 bg-primary/5 whitespace-nowrap">Aurora Transport</th>
                    <th className="text-center font-semibold text-muted-foreground px-3 md:px-6 py-4 whitespace-nowrap">Excel/WhatsApp</th>
                    <th className="text-center font-semibold text-muted-foreground px-3 md:px-6 py-4 whitespace-nowrap">Dyra system</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Jobbdispatch i realtid', true, false, true],
                    ['Mobilapp för förare', true, false, true],
                    ['Fast pris per månad', true, true, false],
                    ['Obegränsat antal användare', true, true, false],
                    ['Kom igång utan demo', true, true, false],
                    ['Support på svenska', true, false, false],
                    ['Pris per månad', '449 kr', '0 kr', '2 000–10 000 kr'],
                  ].map(([label, a, b, c], i) => (
                    <tr key={i as number} className="border-b border-border last:border-0">
                      <td className="px-4 md:px-6 py-3.5 text-foreground font-medium">{label}</td>
                      <td className="px-3 md:px-6 py-3.5 text-center bg-primary/5">
                        <CompCell value={a} highlight />
                      </td>
                      <td className="px-3 md:px-6 py-3.5 text-center"><CompCell value={b} /></td>
                      <td className="px-3 md:px-6 py-3.5 text-center"><CompCell value={c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 md:py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Vad våra användare säger</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary-hover p-10 md:p-14 text-primary-foreground shadow-xl shadow-primary/20"
          >
            <div className="text-5xl font-serif leading-none text-primary-foreground/40">"</div>
            <blockquote className="mt-2 text-xl md:text-2xl font-medium leading-relaxed">
              Vi hanterade allt i WhatsApp-grupper innan. Nu har vi allt samlat — uppdrag, tidrapporter och förare. Systemet sparar tid varje dag.
            </blockquote>
            <div className="mt-6">
              <div className="font-semibold">CJ Bemanning</div>
              <div className="text-sm text-primary-foreground/80">Bemanningsföretag, Sverige</div>
            </div>
          </motion.div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            {[
              'Vi bytte från papper och Excel till Aurora Transport på en eftermiddag. Nu har vi koll på alla uppdrag i realtid.',
              'Äntligen ett system som inte kräver en veckas utbildning. Förarna fattade direkt.',
              'Priset var det som avgjorde — 449 kr oavsett hur många förare vi har.',
              'Tidrapporterna exporteras smidigt och sparar oss timmar varje månad.',
            ].map((q, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-background p-6 shadow-sm"
              >
                <p className="text-sm leading-relaxed text-foreground">"{q}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Vanliga frågor</h2>
          </div>
          <div className="mt-12 max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: 'Hur snabbt kommer vi igång?', a: 'De flesta kunder är igång samma dag. Vi hjälper er med en personlig onboarding där vi konfigurerar systemet, lägger in kunder och förare och går igenom flödet med teamet.' },
                { q: 'Behöver förare installera något?', a: 'Nej. Förarna loggar in direkt i webbläsaren på sin mobil — inga appar behöver laddas ner från App Store eller Google Play.' },
                { q: 'Kan vi avsluta när vi vill?', a: 'Ja. Det finns ingen bindningstid. Säg upp när som helst med 30 dagars uppsägningstid.' },
                { q: 'Kan ni hjälpa oss lägga in kunder och förare?', a: 'Ja. Setupavgiften (3 500 kr) inkluderar att vi konfigurerar systemet åt er, importerar kunder och förare och utbildar teamet.' },
                { q: 'Passar Aurora Transport små åkerier?', a: 'Ja — vi är byggda för företag med 3–30 förare. Små åkerier, budfirmor, transportbemanning och lokala distributionsföretag är vår kärnmålgrupp.' },
                { q: 'Hur skiljer ni er från större TMS-system?', a: 'Vi är enklare att komma igång med, har fast pris utan licenskostnad per användare och fokuserar på det svenska transportföretagens vardag — inte på funktioner ni aldrig använder.' },
                { q: 'Fungerar det med Fortnox?', a: 'Ja, systemet skapar fakturaunderlag och exporterar data till Fortnox och andra bokföringsprogram (SIE, CSV).' },
              ].map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-xl border border-border bg-card px-5 shadow-sm"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="py-16 bg-secondary/40 border-y border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Transportledningssystem för moderna åkerier och bemanningsföretag
          </h2>
          <p className="mt-5 text-base text-muted-foreground leading-relaxed">
            Aurora Transport är ett svenskt transportledningssystem byggt för små och medelstora transport-, åkeri- och bemanningsföretag.
            Plattformen samlar allt du behöver — jobbdispatch, personalhantering, tidrapportering och fakturering — i ett enda verktyg
            med fast pris på 449 kr/mån.
          </p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 text-sm text-muted-foreground">
            {[
              'Jobbdispatch i realtid',
              'Digital tidrapportering',
              'GPS-spårning och kartöversikt',
              'Kundregister och prislistor',
              'Fakturaunderlag',
              'Förarapp i mobilen',
              'Fortnox-export',
              'Obegränsat antal användare',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LÄS MER */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center">Läs mer</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              { to: '/transportledningssystem', label: 'Transportledningssystem' },
              { to: '/akeri-system', label: 'System för åkerier' },
              { to: '/dispatch-system', label: 'Dispatch-system' },
              { to: '/budtjanst-app', label: 'App för budtjänst' },
              { to: '/coredination-alternativ', label: 'Alternativ till Coordination' },
              { to: '/tjanster', label: 'Alla funktioner' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <span className="text-sm font-medium text-foreground">{l.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SLUT-CTA */}
      <section className="py-20 md:py-24 relative overflow-hidden bg-sidebar">
        <div className="absolute inset-0 -z-0 bg-gradient-to-br from-sidebar via-sidebar to-primary/40" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/30 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-sidebar-foreground">
              Redo att slippa Excel och WhatsApp?
            </h2>
            <p className="mt-5 text-lg text-sidebar-foreground/80">
              15 minuters demo räcker för att se om Aurora Transport passar er. 449 kr/mån, ingen bindningstid.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => openLead("final")}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-12 px-8 text-base"
              >
                Boka 15 min demo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleDemo}
                disabled={demoLoading}
                className="h-12 px-8 text-base bg-transparent border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              >
                {demoLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loggar in...</>
                ) : 'Se demo med exempeldata'}
              </Button>
            </div>
            <a
              href="mailto:info@auroramedia.se"
              className="mt-6 inline-flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              info@auroramedia.se
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                  <Truck className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
                </div>
                <span className="text-base font-semibold">Aurora Transport</span>
              </Link>
              <p className="mt-4 text-sm text-sidebar-foreground/70 leading-relaxed">
                En produkt av Aurora Media AB<br />
                Org.nr 559272-0220
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-sidebar-foreground">Produkt</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-sidebar-foreground/70">
                <li><Link to="/tjanster" className="hover:text-sidebar-foreground transition-colors">Tjänster</Link></li>
                <li><Link to="/transportledningssystem" className="hover:text-sidebar-foreground transition-colors">Transportledningssystem</Link></li>
                <li><Link to="/coredination-alternativ" className="hover:text-sidebar-foreground transition-colors">Coordination alternativ</Link></li>
                <li><Link to="/akeri-system" className="hover:text-sidebar-foreground transition-colors">Åkerisystem</Link></li>
                <li><Link to="/dispatch-system" className="hover:text-sidebar-foreground transition-colors">Dispatch system</Link></li>
                <li><Link to="/budtjanst-app" className="hover:text-sidebar-foreground transition-colors">Budtjänst app</Link></li>
                <li><Link to="/transportplanering" className="hover:text-sidebar-foreground transition-colors">Transportplanering</Link></li>
                <li><Link to="/digital-foljesedel" className="hover:text-sidebar-foreground transition-colors">Digital följesedel</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-sidebar-foreground">Företag</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-sidebar-foreground/70">
                <li><Link to="/om-oss" className="hover:text-sidebar-foreground transition-colors">Om oss</Link></li>
                <li><Link to="/integritetspolicy" className="hover:text-sidebar-foreground transition-colors">Integritetspolicy</Link></li>
                <li><Link to="/kontakt" className="hover:text-sidebar-foreground transition-colors">Kontakt</Link></li>
                <li><Link to="/blogg" className="hover:text-sidebar-foreground transition-colors">Blogg</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/50">
            © {new Date().getFullYear()} Aurora Media AB. Alla rättigheter reserverade.
          </div>
        </div>
      </footer>

      <LeadFormModal open={leadModalOpen} onOpenChange={setLeadModalOpen} />

      {/* Mobil sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Button
          onClick={() => openLead('sticky_mobile')}
          className="w-full h-12 text-base bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          Boka 15 min demo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* -------- DASHBOARD MOCKUP -------- */
function DashboardMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl" />

      <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-secondary/40">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <div className="ml-4 flex-1 rounded-md bg-background/80 border border-border px-3 py-1 text-[10px] text-muted-foreground font-mono">
            app.auroratransport.se
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr] min-h-[460px]">
          {/* Sidebar */}
          <aside className="bg-sidebar text-sidebar-foreground p-3 space-y-0.5">
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <Truck className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-xs font-semibold">Aurora Transport</span>
            </div>
            {[
              { icon: LayoutDashboard, label: 'Översikt', active: true },
              { icon: ClipboardList, label: 'Uppdrag' },
              { icon: Users, label: 'Förare' },
              { icon: UserCog, label: 'Personal' },
              { icon: Clock, label: 'Tidrapport' },
              { icon: BarChart3, label: 'Rapporter' },
              { icon: Settings, label: 'Inställningar' },
            ].map((it) => (
              <div
                key={it.label}
                className={`flex items-center gap-2 px-2 py-2 rounded-md text-[11px] ${
                  it.active
                    ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                    : 'text-sidebar-foreground/60'
                }`}
              >
                <it.icon className="h-3.5 w-3.5" />
                <span>{it.label}</span>
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="p-5 space-y-4 bg-background">
            {/* Top stat cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pågående uppdrag', value: '12', icon: Route, tint: 'bg-primary/10 text-primary' },
                { label: 'Tilldelade förare', value: '8', icon: Users, tint: 'bg-success/10 text-success' },
                { label: 'Idag rapporterade', value: '6', icon: Clock, tint: 'bg-warning/10 text-warning' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${s.tint}`}>
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-2 text-lg font-bold tracking-tight text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Active assignment + map */}
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Aktuellt uppdrag
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/10 text-success px-2 py-0.5 text-[10px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Pågående
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">Göteborg → Stockholm</div>
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  <div>Upphämtning <span className="text-foreground font-medium">08:30</span></div>
                  <div>Kund: <span className="text-foreground">Nilsson Åkeri AB</span></div>
                  <div>Förare: <span className="text-foreground">Johan Svensson</span></div>
                </div>
                <button className="mt-4 w-full rounded-md bg-primary text-primary-foreground text-[11px] font-medium py-2 hover:bg-primary-hover transition-colors">
                  Markera som slutförd
                </button>
              </div>

              {/* Map mini */}
              <div className="rounded-lg border border-border bg-gradient-to-br from-[hsl(214_60%_94%)] to-[hsl(214_60%_88%)] relative overflow-hidden">
                <svg viewBox="0 0 120 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  {/* Road lines */}
                  <path d="M 20 180 Q 30 140 50 110 T 90 50 L 100 20" stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" strokeDasharray="4 3" opacity="0.7" />
                  <circle cx="20" cy="180" r="4" fill="hsl(var(--success))" />
                  <circle cx="100" cy="20" r="4" fill="hsl(var(--primary))" />
                  {/* Faint grid */}
                  <g stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5">
                    <line x1="0" y1="50" x2="120" y2="50" />
                    <line x1="0" y1="100" x2="120" y2="100" />
                    <line x1="0" y1="150" x2="120" y2="150" />
                  </g>
                </svg>
                <div className="absolute bottom-2 left-2 right-2 text-[9px] text-foreground/70 bg-background/70 backdrop-blur rounded px-1.5 py-1 text-center">
                  Live-rutt
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- ASSIGNMENT TABLE MOCKUP -------- */
function AssignmentTableMockup() {
  const rows = [
    { id: '#1042', route: 'Göteborg → Stockholm', driver: 'Johan Svensson', status: 'Pågående', statusKind: 'active', time: '08:30', customer: 'Nilsson Åkeri AB' },
    { id: '#1041', route: 'Malmö → Jönköping', driver: 'Sara Andersson', status: 'Planerad', statusKind: 'pending', time: '09:00', customer: 'AB Transport' },
    { id: '#1040', route: 'Helsingborg → Göteborg', driver: 'Ali Hassan', status: 'Planerad', statusKind: 'pending', time: '10:30', customer: 'Skåne Logistik AB' },
    { id: '#1039', route: 'Stockholm → Uppsala', driver: 'Maria Karlsson', status: 'Klar', statusKind: 'completed', time: '07:00', customer: 'Nordic Freight AB' },
  ];

  const statusClass = (k: string) => {
    if (k === 'active') return 'bg-success/10 text-success';
    if (k === 'pending') return 'bg-primary/10 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xl shadow-primary/5 overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-secondary/40">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
      </div>
      <div className="grid grid-cols-[180px_1fr] min-h-[440px]">
        {/* Sidebar */}
        <aside className="bg-sidebar text-sidebar-foreground p-4 space-y-1">
          <div className="flex items-center gap-2 px-2 py-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Aurora Transport</span>
          </div>
          {[
            { icon: LayoutDashboard, label: 'Översikt' },
            { icon: ClipboardList, label: 'Uppdrag', active: true },
            { icon: Users, label: 'Förare' },
            { icon: Clock, label: 'Tidrapport' },
            { icon: FileText, label: 'Fakturor' },
            { icon: BarChart3, label: 'Rapporter' },
          ].map((it) => (
            <div
              key={it.label}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs ${
                it.active
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/60'
              }`}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </div>
          ))}
        </aside>

        {/* Main */}
        <div className="p-6 bg-background flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <div className="h-9 rounded-lg border border-border bg-card pl-9 pr-3 flex items-center text-xs text-muted-foreground">
                  Sök uppdrag, kund eller förare...
                </div>
              </div>
              <button className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground">
                Filter
              </button>
            </div>
            <button className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nytt uppdrag
            </button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-semibold">Uppdrag</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Förare</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Tid</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Kund</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-mono text-muted-foreground text-[10px]">{r.id}</div>
                      <div className="font-medium text-foreground">{r.route}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.driver}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${statusClass(r.statusKind)}`}>
                        {r.statusKind === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono">{r.time}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.customer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- COMPARISON CELL -------- */
function CompCell({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === 'string') {
    return <span className={highlight ? 'font-semibold text-primary' : 'text-foreground'}>{value}</span>;
  }
  if (value) {
    return (
      <CheckCircle2 className={`mx-auto h-5 w-5 ${highlight ? 'text-primary' : 'text-success'}`} />
    );
  }
  return <Minus className="mx-auto h-5 w-5 text-muted-foreground/50" />;
}
