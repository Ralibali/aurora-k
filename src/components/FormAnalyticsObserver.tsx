import { useEffect } from 'react';
import { track } from '@/lib/track';

type PublicFormType = 'demo' | 'lead' | 'transport_booking';

function identifyForm(form: HTMLFormElement): PublicFormType | null {
  if (form.querySelector('#demo-email')) return 'demo';
  if (form.querySelector('#lead-email')) return 'lead';
  if (form.textContent?.includes('Skicka transportförfrågan')) return 'transport_booking';
  return null;
}

export function FormAnalyticsObserver() {
  useEffect(() => {
    const attached = new WeakSet<HTMLFormElement>();
    const successful = new Set<string>();

    const attach = (form: HTMLFormElement) => {
      if (attached.has(form)) return;
      const type = identifyForm(form);
      if (!type) return;
      attached.add(form);

      let started = false;
      form.addEventListener('input', () => {
        if (started) return;
        started = true;
        track(`${type}_form_start`, { source: 'public_form', page: window.location.pathname });
      }, { once: true });

      form.addEventListener('invalid', () => {
        track(`${type}_validation_error`, { source: 'browser_validation', page: window.location.pathname });
      }, true);

      form.addEventListener('submit', () => {
        track(`${type}_submit_attempt`, { source: 'public_form', page: window.location.pathname });
      });
    };

    const scan = () => {
      document.querySelectorAll<HTMLFormElement>('form').forEach(attach);

      const visibleText = document.body.innerText.toLowerCase();
      const successSignals: Array<[string, string, boolean]> = [
        ['demo_submit_success', 'bokningen är mottagen', true],
        ['lead_submit_success', 'din intresseanmälan har landat', true],
        ['transport_booking_submit_success', 'vi har tagit emot din förfrågan', false],
      ];

      for (const [eventName, signal, isLead] of successSignals) {
        if (!visibleText.includes(signal) || successful.has(eventName)) continue;
        successful.add(eventName);
        track(eventName, { source: 'ui_confirmation', page: window.location.pathname });
        if (isLead) track('generate_lead', { currency: 'SEK', value: 0, lead_source: eventName });
      }

      if (visibleText.includes('något gick fel. försök igen') && !successful.has('form_submit_error')) {
        successful.add('form_submit_error');
        track('form_submit_error', { source: 'ui_error', page: window.location.pathname });
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
