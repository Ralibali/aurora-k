import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Truck, ClipboardList, Users, FileText, BarChart3,
  MapPin, Camera, Clock, Shield, Smartphone, Zap,
  ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function FeatureCard({ icon: Icon, title, desc, index }: { icon: any; title: string; desc: string; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary/25">
        {number}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      navigate(role === 'admin' ? '/admin' : '/driver', { replace: true });
    }
  }, [loading, session, role, navigate]);

  const adminFeatures = [
    { icon: ClipboardList, title: 'Uppdragshantering', desc: 'Skapa, tilldela och följ uppdrag i realtid. Byt chaufför eller redigera detaljer när som helst.' },
    { icon: Users, title: 'Kundregister', desc: 'Hantera kunder med prissättning, kontaktuppgifter och faktureringsadresser på ett ställe.' },
    { icon: FileText, title: 'Fakturering', desc: 'Skapa fakturor baserat på utförda uppdrag med automatisk beräkning och PDF-export.' },
    { icon: BarChart3, title: 'Rapporter & statistik', desc: 'Exportera tidrapporter till PDF eller Excel. Generera faktureringsunderlag per kund.' },
    { icon: Zap, title: 'Realtids-dashboard', desc: 'Följ alla aktiva uppdrag live med tidräknare och statusuppdateringar i realtid.' },
    { icon: Shield, title: 'Ändringshistorik', desc: 'Full spårbarhet med logg över alla ändringar — vem gjorde vad och när.' },
  ];

  const driverFeatures = [
    { icon: MapPin, title: 'Navigering', desc: 'Öppna adressen direkt i kartor med ett tryck. Instruktioner och meddelanden från admin.' },
    { icon: Clock, title: 'Tidrapportering', desc: 'Starta och stoppa uppdrag med automatisk tidräkning. Allt dokumenteras.' },
    { icon: Camera, title: 'Fotodokumentation', desc: 'Fota fraktsedlar och samla in digitala signaturer direkt i appen.' },
    { icon: Smartphone, title: 'Mobilanpassad', desc: 'Installera som app på telefonen. Fungerar offline-ready med push-notiser.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">Aurora Transport</span>
          </div>
          <Link to="/login">
            <Button size="sm" className="rounded-xl shadow-md shadow-primary/15 font-semibold px-5">
              Logga in <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-1/3 -right-1/4 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-success/5 blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20">
              <Zap className="h-3.5 w-3.5" />
              Komplett transporthantering
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
              Från uppdrag{' '}
              <span className="text-primary">till faktura</span>
              <br />
              — på ett ställe
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
              Aurora Transport digitaliserar hela transportflödet. Skapa uppdrag, följ chaufförer i realtid, 
              dokumentera leveranser och fakturera — allt i en plattform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login">
                <Button size="lg" className="rounded-xl shadow-lg shadow-primary/20 font-semibold px-8 h-13 text-base w-full sm:w-auto">
                  Kom igång <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#funktioner">
                <Button size="lg" variant="outline" className="rounded-xl font-semibold px-8 h-13 text-base w-full sm:w-auto">
                  Se funktioner <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {[
              { value: '100%', label: 'Digital' },
              { value: 'Realtid', label: 'Uppdateringar' },
              { value: 'Säker', label: 'Rollbaserad' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Admin features */}
      <section id="funktioner" className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              Administratör
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Full kontroll över verksamheten
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Allt du behöver för att planera, följa upp och fakturera transportuppdrag.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {adminFeatures.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Driver features */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold mb-4">
              Chaufför
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Byggd för vägen
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Mobilanpassad upplevelse som gör det enkelt att hantera uppdrag direkt från telefonen.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {driverFeatures.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Så fungerar det</h2>
            <p className="text-muted-foreground">Tre enkla steg till effektivare transporthantering.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <StepCard number="1" title="Skapa uppdrag" desc="Lägg in kund, adress, tid och tilldela en chaufför med några klick." />
            <StepCard number="2" title="Chauffören levererar" desc="Chauffören ser uppdraget, navigerar, dokumenterar och rapporterar — allt i mobilen." />
            <StepCard number="3" title="Fakturera" desc="Generera fakturor baserat på utförda uppdrag. Exportera PDF eller Excel." />
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-8 sm:p-10"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 text-center">
              Allt du behöver — inbyggt
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Realtidsuppdateringar',
                'Rollbaserad åtkomst',
                'Digital signering',
                'Fotodokumentation',
                'PDF-fakturering',
                'Excel-export',
                'Tidrapportering',
                'Ändringshistorik',
                'Mobilapp (PWA)',
                'Kundhantering',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Redo att digitalisera din transportverksamhet?
            </h2>
            <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
              Logga in för att börja hantera dina uppdrag, chaufförer och fakturor på ett smidigt och säkert sätt.
            </p>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="rounded-xl font-semibold px-8 h-13 text-base shadow-lg">
                Logga in nu <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Aurora Transport</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Aurora Medias Transport AB. Alla rättigheter förbehållna.
          </p>
        </div>
      </footer>
    </div>
  );
}
