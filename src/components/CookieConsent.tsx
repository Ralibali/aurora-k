import { setAnalyticsConsent } from '@/lib/ga4Runtime';
import { parseStatisticsConsent, storeStatisticsConsent } from '@/lib/statisticsConsent';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'aurora_ga4_consent_v1';

type ConsentStatus = 'accepted' | 'rejected' | null;

function getConsent(): ConsentStatus {
  try {
    const choice = parseStatisticsConsent(localStorage.getItem(COOKIE_CONSENT_KEY));
    return choice ? (choice.analytics ? 'accepted' : 'rejected') : null;
  } catch {
    return null;
  }
}

function updateGoogleAnalyticsConsent(status: Exclude<ConsentStatus, null>) {
  setAnalyticsConsent(status === 'accepted');
  window.dispatchEvent(new CustomEvent('privacy:analytics-consent', { detail: status === 'accepted' }));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith('at_analytics_v1:')) localStorage.removeItem(key);
    } catch { /* Unavailable browser storage. */ }
    const existingConsent = getConsent();
    if (existingConsent) updateGoogleAnalyticsConsent(existingConsent);

    // Small delay so it doesn't flash on page load
    const timer = setTimeout(() => {
      if (!existingConsent) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    storeStatisticsConsent(COOKIE_CONSENT_KEY, true);
    updateGoogleAnalyticsConsent('accepted');
    setVisible(false);
  };

  const handleReject = () => {
    storeStatisticsConsent(COOKIE_CONSENT_KEY, false);
    updateGoogleAnalyticsConsent('rejected');
    setVisible(false);
  };

  if (!visible) return <button type="button" onClick={() => setVisible(true)} className="cookie-preferences fixed bottom-2 left-2 z-40 rounded border bg-background px-2 py-1 text-xs">Cookieinställningar</button>;

  return (
    <div className="cookie-consent fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto max-w-xl bg-card border border-border rounded-xl shadow-lg p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              Vi använder nödvändiga cookies för inloggning och använder Google Analytics 4 efter ditt samtycke för att förstå hur webbplatsen används och Sentry för teknisk feldiagnostik.{' '}
              <a href="/privacy" className="underline text-primary hover:text-primary/80 transition-colors">
                Läs vår integritetspolicy
              </a>
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleAccept} className="rounded-lg">
                Acceptera statistik
              </Button>
              <Button size="sm" variant="outline" onClick={handleReject} className="rounded-lg">
                Endast nödvändiga
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
