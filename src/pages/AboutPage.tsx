import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, Mail, Building2, Globe, Shield, Users, Truck, Heart, Send, Loader2 } from 'lucide-react';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const values = [
  { icon: Truck, title: 'Branschfokus', desc: 'Vi bygger enbart för transportbranschen – varje funktion är skräddarsydd för åkerier, budföretag och logistikföretag.' },
  { icon: Shield, title: 'Trygghet & säkerhet', desc: 'All data lagras säkert inom EU med kryptering, automatisk backup och fullständig GDPR-efterlevnad.' },
  { icon: Heart, title: 'Enkel prissättning', desc: 'Fast pris på 449 kr/mån – inga dolda avgifter, inga per-användare-kostnader, obegränsat antal förare och admins.' },
  { icon: Users, title: 'Personlig support', desc: 'Vi är ett litet team som bryr oss. Du får alltid snabb och personlig hjälp – ingen telefonkö eller ärendenummer.' },
];

export default function AboutPage() {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (theme !== 'light') setTheme('light');
  }, [theme, setTheme]);

  useEffect(() => {
    document.title = 'Om oss – Aurora Transport | Transportledningssystem';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Aurora Transport utvecklas av Aurora Media AB (559272-0220). Läs om företaget, vår vision och varför vi bygger Sveriges smartaste transportledningssystem.');
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Aurora Media AB",
      "url": "https://aurora-k.lovable.app",
      "logo": "https://aurora-k.lovable.app/placeholder.svg",
      "description": "Aurora Media AB utvecklar Aurora Transport – ett modernt transportledningssystem för svenska åkerier och transportföretag.",
      "foundingDate": "2022",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "SE"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "info@auroramedia.se",
        "contactType": "customer service"
      },
      "taxID": "559272-0220"
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    script.id = 'about-jsonld';
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('about-jsonld');
      if (el) el.remove();
    };
  }, []);

  useBreadcrumbJsonLd([
    { name: 'Hem', url: 'https://aurora-k.lovable.app/' },
    { name: 'Om oss', url: 'https://aurora-k.lovable.app/om-oss' },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-primary">Aurora Transport</Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Hem</Link>
            <Link to="/login">
              <Button size="sm" variant="outline">Logga in</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h1
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          >
            Vi digitaliserar Sveriges transportbransch
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          >
            Aurora Transport är byggt av Aurora Media AB – ett svenskt teknikbolag med passion för att göra vardagen enklare för transportföretag, åkerier och budföretag i hela Norden.
          </motion.p>
        </div>
      </section>

      {/* About section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Om Aurora Media AB</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              <p>
                <strong>Aurora Media AB</strong> (org.nr 559272-0220) är ett svenskt mjukvaruföretag som specialiserar sig på digitala verktyg för transportbranschen. Vi grundades med en tydlig vision: att ge små och medelstora åkerier samma kraftfulla verktyg som stora logistikföretag – men till en bråkdel av kostnaden.
              </p>
              <p>
                Vår flaggskeppsprodukt, <strong>Aurora Transport</strong>, är ett komplett transportledningssystem (TMS) som samlar uppdragshantering, förarapp, GPS-spårning, tidrapportering, kundhantering och fakturering i en enda plattform. Systemet är byggt som en progressiv webbapp (PWA) som fungerar direkt i mobilen utan nedladdning – perfekt för förare på fältet.
              </p>
              <p>
                Vi tror på transparens och enkelhet. Därför erbjuder vi en <strong>fast månadsavgift på 449 kr</strong> – oavsett hur många förare, administratörer eller kunder du har. Inga dolda avgifter, inga per-användare-kostnader, inga bindningstider utöver 30 dagars uppsägningstid.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Vår vision</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              <p>
                Transportbranschen är ryggraden i svensk ekonomi, men många åkerier kämpar fortfarande med pappersbaserade rutiner, Excel-listor och fragmenterade system. Vi vill ändra på det.
              </p>
              <p>
                Vår vision är att varje transportföretag i Norden – oavsett storlek – ska ha tillgång till ett modernt, intuitivt och prisvärt transportledningssystem. Ett system som sparar tid, minskar fel och ger full kontroll över verksamheten från dag ett.
              </p>
              <p>
                Vi utvecklar Aurora Transport i nära samarbete med våra kunder. Varje funktion vi bygger löser ett verkligt problem som åkeriägare, trafikledare och förare möter i sin vardag. Det är så vi skiljer oss från generella projektverktyg och dyra enterprise-lösningar.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-4">
          <motion.h2
            className="text-2xl font-bold text-center mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            Det vi står för
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                className="flex gap-4"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <v.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO block */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-2xl font-bold mb-6">Varför välja Aurora Transport?</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              <p>
                Aurora Transport är ett <strong>svenskt transportledningssystem</strong> byggt för åkerier, budföretag, leveransföretag och logistikbolag. Till skillnad från generella verktyg som Coredination och andra plattformar är Aurora Transport specialbyggt för den svenska transportbranschen med stöd för <strong>Fortnox-export, svenska faktureringsregler och momshantering</strong>.
              </p>
              <p>
                Systemet inkluderar <strong>körorder och uppdragshantering</strong>, <strong>digital tidrapportering</strong> med automatisk löneberäkning, <strong>GPS-spårning i realtid</strong> via livekarta, <strong>kundportal</strong> med bokningsförfrågningar, samt <strong>komplett fakturering</strong> med artikelregister och kundspecifika prislistor. Allt är tillgängligt direkt i webbläsaren – ingen installation krävs.
              </p>
              <p>
                För förare erbjuder vi en <strong>mobiloptimerad förarapp</strong> med uppdragslista, navigation, fotobevis, digital signatur och tidrapport. Administratörer får en kraftfull dashboard med statistik, rapporter, kalendervy, fordonshantering och mycket mer.
              </p>
              <p>
                Aurora Transport är det <strong>prisvärda alternativet till Coredination, Transportledning.se och andra åkerisystem</strong>. Med fast pris, obegränsade användare och svensk support gör vi det enkelt att digitalisera din transportverksamhet.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-card border-y border-border" id="kontakt">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Kontakta oss</h2>
            <p className="text-muted-foreground text-lg">
              Har du frågor, vill boka en demo eller bara veta mer? Fyll i formuläret så återkommer vi.
            </p>
          </motion.div>

          <motion.form
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const name = fd.get('name') as string;
              const email = fd.get('email') as string;
              const phone = fd.get('phone') as string;
              const message = fd.get('message') as string;

              if (!name || !email || !message) {
                toast.error('Fyll i alla obligatoriska fält');
                return;
              }

              setSubmitting(true);
              try {
                const { error } = await supabase.functions.invoke('send-email', {
                  body: {
                    to: 'info@auroramedia.se',
                    subject: `Kontaktförfrågan från ${name}`,
                    html: `
                      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a">Nytt meddelande via kontaktformuläret</h2>
                      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333">
                        <tr><td style="padding:8px 0;font-weight:600;width:100px">Namn:</td><td style="padding:8px 0">${name}</td></tr>
                        <tr><td style="padding:8px 0;font-weight:600">E-post:</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
                        ${phone ? `<tr><td style="padding:8px 0;font-weight:600">Telefon:</td><td style="padding:8px 0">${phone}</td></tr>` : ''}
                      </table>
                      <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;font-size:14px;line-height:1.6;color:#333">
                        ${message.replace(/\n/g, '<br/>')}
                      </div>
                    `,
                  },
                });
                if (error) throw error;
                toast.success('Tack! Vi har mottagit ditt meddelande och återkommer så snart vi kan.');
                form.reset();
              } catch (err) {
                console.error('[contact-form]', err);
                toast.error('Kunde inte skicka meddelandet. Försök igen eller maila oss direkt.');
              } finally {
                setSubmitting(false);
              }
            }}
            className="space-y-5 bg-background rounded-xl p-6 md:p-8 border border-border shadow-sm"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name">Namn *</Label>
                <Input id="name" name="name" placeholder="Ditt namn" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-post *</Label>
                <Input id="email" name="email" type="email" placeholder="din@epost.se" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" type="tel" placeholder="070-123 45 67" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Meddelande *</Label>
              <Textarea id="message" name="message" placeholder="Beskriv vad du vill veta mer om..." rows={5} required />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Skickar...' : 'Skicka meddelande'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Du kan också nå oss direkt på <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a>
            </p>
          </motion.form>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">Redo att komma igång?</h2>
          <p className="text-primary-foreground/80 text-lg">Testa Aurora Transport gratis – inga bindningstider.</p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Kom igång gratis <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-sm text-primary-foreground/60">
            Aurora Media AB · Org.nr 559272-0220 · Sverige
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Aurora Media AB</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">Hem</Link>
            <Link to="/transportledningssystem" className="hover:text-foreground transition-colors">Transportledningssystem</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
