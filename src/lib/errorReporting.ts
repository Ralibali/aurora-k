import * as Sentry from '@sentry/react';
import { parseStatisticsConsent } from './statisticsConsent';

// Optional browser diagnostics follow the same explicit statistics choice as GA4.
export function installConsentAwareErrorReporting(): void {
  let active = false;
  const apply = (granted: boolean) => {
    if (granted === active) return;
    active = granted;
    if (!granted) {
      const options = Sentry.getClient()?.getOptions();
      if (options) options.enabled = false;
      return;
    }
    Sentry.init({
      dsn: 'https://d838e2cf945e668ad9d1f63d7586ba00@o4511191910383616.ingest.de.sentry.io/4511191916675152',
      sendDefaultPii: false,
      enabled: import.meta.env.PROD,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend(event) {
        if (!active) return null;
        delete event.user;
        delete event.extra;
        delete event.tags;
        event.breadcrumbs = [];
        delete event.message;
        delete event.transaction;
        delete event.contexts;
        delete event.logentry;
        for (const item of event.exception?.values || []) {
          delete item.value;
          for (const frame of item.stacktrace?.frames || []) {
            delete frame.abs_path;
            delete frame.context_line;
            delete frame.pre_context;
            delete frame.post_context;
            delete frame.vars;
            if (frame.filename) {
              try {
                const url = new URL(frame.filename, window.location.origin);
                frame.filename = url.origin;
              } catch { delete frame.filename; }
            }
          }
        }
        if (event.request) {
          try {
            const url = new URL(event.request.url || window.location.href);
            event.request = { url: url.origin };
          } catch { delete event.request; }
        }
        return event;
      },
    });
  };
  const refresh = () => {
    try { apply(parseStatisticsConsent(localStorage.getItem('aurora_ga4_consent_v1'))?.analytics === true); }
    catch { apply(false); }
  };
  refresh();
  window.addEventListener('privacy:analytics-consent', event => apply((event as CustomEvent).detail === true));
  window.addEventListener('storage', event => { if (event.key === 'aurora_ga4_consent_v1' || event.key === null) refresh(); });
}
