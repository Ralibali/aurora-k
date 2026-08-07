import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'aurora-demo-welcome-dismissed';

/**
 * Welcome banner shown on the admin dashboard when the account has no real data
 * yet AND demo mode is off. Lets the user choose between exploring with example
 * data or starting from scratch.
 */
export function DemoWelcomeBanner({ isEmpty }: { isEmpty: boolean }) {
  const { enabled } = useDemoMode();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DISMISS_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DISMISS_KEY, String(dismissed));
  }, [dismissed]);

  if (!isEmpty || enabled || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card p-5 md:p-6 shadow-card">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
        aria-label="Stäng välkomstbanner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 max-w-3xl">
        <div className="hidden sm:inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-primary mb-2">
            <span className="h-1 w-1 rounded-full bg-primary" /> Ditt demo-konto
          </p>
          <h3 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
            Det här är ditt demo-konto
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Du kan slå på exempeldata under Inställningar för att se hur uppdrag, förare, fakturor,
            statistik och miljödata hänger ihop — din egen data påverkas inte — eller börja skapa själv direkt.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button size="sm" asChild className="gap-1.5">
              <Link to="/admin/settings">
                <Sparkles className="h-3.5 w-3.5" />
                Visa exempeldata via inställningar
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="gap-1.5">
              <Link to="/admin/customers/new">
                Börja skapa själv
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}