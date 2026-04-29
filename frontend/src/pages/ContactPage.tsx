import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/use-page-meta';
import { useBreadcrumbJsonLd } from '@/lib/breadcrumb-jsonld';
import { useMemo } from 'react';
import { Truck, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadForm } from '@/components/LeadForm';

export default function ContactPage() {
  usePageMeta({
    title: 'Kontakta oss – Aurora Transport',
    description: 'Intresserad av Aurora Transport? Fyll i formuläret så kontaktar vi dig för en personlig demo och genomgång.',
    canonical: 'https://auroratransport.se/kontakt',
    ogImage: 'https://auroratransport.se/og-image.png',
  });

  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Kontakt', url: 'https://auroratransport.se/kontakt' },
  ], []));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Simple navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Aurora Transport</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tillbaka
            </Link>
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Left column — info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Kontakta oss
              </h1>
              <p className="mt-3 text-muted-foreground">
                Vill du veta mer om hur Aurora Transport kan effektivisera er transportverksamhet?
                Fyll i formuläret så ringer vi upp dig.
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Telefon</p>
                  <a href="tel:+46101234567" className="text-muted-foreground hover:text-foreground">010-123 45 67</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">E-post</p>
                  <a href="mailto:info@auroratransport.se" className="text-muted-foreground hover:text-foreground">info@auroratransport.se</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Kontor</p>
                  <p className="text-muted-foreground">Linköping, Sverige</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <p className="text-sm font-medium text-foreground">Vad händer sedan?</p>
              <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Vi kontaktar dig inom 24 timmar</li>
                <li>Personlig genomgång av systemet</li>
                <li>Vi hjälper dig komma igång</li>
              </ol>
            </div>
          </div>

          {/* Right column — form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-semibold text-foreground mb-1">Intresseanmälan</h2>
              <p className="text-sm text-muted-foreground mb-6">Alla fält markerade med * är obligatoriska.</p>
              <LeadForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
