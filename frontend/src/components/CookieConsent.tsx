import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'aurora_cookie_consent';

type ConsentStatus = 'accepted' | 'rejected' | null;

function getConsent(): ConsentStatus {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentStatus;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't flash on page load
    const timer = setTimeout(() => {
      if (!getConsent()) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto max-w-xl bg-card border border-border rounded-xl shadow-lg p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              Vi använder cookies för att förbättra din upplevelse och hålla dig inloggad. 
              Inga tredjepartscookies används.{' '}
              <a href="/privacy" className="underline text-primary hover:text-primary/80 transition-colors">
                Läs vår integritetspolicy
              </a>
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAccept} className="rounded-lg">
                Acceptera
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReject} className="rounded-lg text-muted-foreground">
                Avvisa
              </Button>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Stäng"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
