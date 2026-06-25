import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Send, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/track';

type DemoFormState = { contactPerson: string; companyName: string; email: string; phone: string };
const EMPTY_FORM: DemoFormState = { contactPerson: '', companyName: '', email: '', phone: '' };
const BENEFITS = [
  'Anpassad demo efter er verksamhet',
  'Konkreta svar på era frågor',
  'Ingen säljpitch eller bindningstid',
  'Support och onboarding på svenska',
];

function utmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
  };
}

function DemoLeadForm({ source }: { source: string }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const started = useRef(false);

  const update = (field: keyof DemoFormState, value: string) => {
    if (!started.current) {
      started.current = true;
      track('demo_form_start', { source, first_field: field, page: window.location.pathname });
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const required = form.contactPerson.trim() && form.companyName.trim() && form.email.trim();
    if (!required) {
      track('demo_validation_error', { source, field: 'required', page: window.location.pathname });
      setErrorMessage('Fyll i namn, företag och e-post.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      track('demo_validation_error', { source, field: 'email', page: window.location.pathname });
      setErrorMessage('Ange en giltig e-postadress.');
      return;
    }

    track('demo_submit_attempt', { source, has_phone: Boolean(form.phone.trim()), page: window.location.pathname });
    setSubmitting(true);
    const message = `Demobokning från ${source}. Kunden önskar kontakt för en kostnadsfri 15-minutersdemo.`;

    try {
      const { error } = await supabase.from('leads').insert({
        contact_person: form.contactPerson.trim(), company_name: form.companyName.trim(),
        email: form.email.trim(), phone: form.phone.trim() || null, message,
        ...utmParams(), lead_score: 25,
      });
      if (error) throw error;

      void supabase.functions.invoke('send-email', {
        body: { to: 'info@auroramedia.se', templateName: 'new-lead-notification', templateData: {
          companyName: form.companyName.trim(), contactPerson: form.contactPerson.trim(),
          email: form.email.trim(), phone: form.phone.trim() || null, message,
        } },
      });

      track('demo_submit_success', { source, has_phone: Boolean(form.phone.trim()), page: window.location.pathname });
      track('generate_lead', { currency: 'SEK', value: 0, lead_source: source });
      setSubmitted(true);
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : 'unknown';
      track('demo_submit_error', { source, message: messageText, page: window.location.pathname });
      setErrorMessage('Något gick fel. Försök igen eller mejla info@auroramedia.se.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="py-8 text-center" role="status" aria-live="polite">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
      <h2 className="mt-4 text-2xl font-black text-slate-950">Tack! Din demo är bokad.</h2>
      <p className="mx-auto mt-3 max-w-md text-slate-600">Vi återkommer via e-post eller telefon för att bekräfta en tid som passar.</p>
    </div>
  );

  const fields: Array<{ key: keyof DemoFormState; label: string; placeholder: string; type?: string }> = [
    { key: 'contactPerson', label: 'Ditt namn *', placeholder: 'För- och efternamn' },
    { key: 'companyName', label: 'Företag *', placeholder: 'Företagsnamn' },
    { key: 'email', label: 'E-post *', placeholder: 'namn@foretag.se', type: 'email' },
    { key: 'phone', label: 'Telefon', placeholder: '070-123 45 67', type: 'tel' },
  ];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder, type }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`${source}-${key}`}>{label}</Label>
            <Input id={`${source}-${key}`} type={type} value={form[key]} placeholder={placeholder}
              autoComplete={key === 'contactPerson' ? 'name' : key === 'companyName' ? 'organization' : key}
              onChange={(event) => update(key, event.target.value)} maxLength={key === 'email' ? 255 : key === 'companyName' ? 150 : 100} />
          </div>
        ))}
      </div>
      {errorMessage && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{errorMessage}</p>}
      <Button type="submit" size="lg" disabled={submitting} className="h-12 w-full rounded-xl bg-[#123b88] text-base font-black text-white hover:bg-[#0f2f6e]">
        <Send className="mr-2 h-4 w-4" />{submitting ? 'Skickar...' : 'Boka kostnadsfri demo'}
      </Button>
      <p className="text-center text-xs text-slate-500">15 minuter · Ingen bindningstid · Ingen betalning</p>
    </form>
  );
}

export function StandaloneDemoPage() {
  useEffect(() => {
    document.documentElement.lang = 'sv';
    document.title = 'Boka demo | Aurora Transport';
    track('demo_page_view', { page: window.location.pathname });
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,rgba(18,59,136,0.18),transparent_34rem),linear-gradient(180deg,#eef5ff,#f8fafc_60%,#fff)] px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 font-black"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#123b88] text-white"><Truck className="h-5 w-5" /></span>Aurora Transport</a>
          <a href="/" className="text-sm font-bold text-slate-600 hover:text-slate-950">Till startsidan</a>
        </header>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <section className="pt-4">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#123b88]">Kostnadsfri genomgång</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Se Aurora Transport på 15 minuter</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">Vi visar hur ni kan samla uppdrag, förare, tidrapportering och fakturaunderlag i ett enda enkelt system.</p>
            <ul className="mt-7 space-y-3 text-sm font-bold text-slate-700">{BENEFITS.map((item) => <li key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#123b88]" />{item}</li>)}</ul>
          </section>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,47,110,0.16)] sm:p-8">
            <h2 className="text-2xl font-black">Boka din demo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Fyll i fyra korta fält så kontaktar vi dig för att bekräfta tiden.</p>
            <div className="mt-6"><DemoLeadForm source="standalone_demo" /></div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function MobileConversionShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const pathname = window.location.pathname;
  const isLanding = pathname === '/' || pathname === '/en';

  useEffect(() => {
    if (!isLanding) return;
    const button = document.querySelector<HTMLButtonElement>('header button[aria-label="Meny"], header button[aria-label="Menu"]');
    if (!button) return;
    const toggle = () => setMenuOpen((open) => !open);
    button.addEventListener('click', toggle);
    button.setAttribute('aria-controls', 'mobile-conversion-navigation');
    return () => button.removeEventListener('click', toggle);
  }, [isLanding]);

  useEffect(() => {
    document.querySelector<HTMLButtonElement>('header button[aria-controls="mobile-conversion-navigation"]')?.setAttribute('aria-expanded', String(menuOpen));
  }, [menuOpen]);

  if (!isLanding) return null;
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMenuOpen(false); };
  const openDemo = (source: string) => { track('demo_cta_click', { source, page: pathname }); setMenuOpen(false); setDemoOpen(true); };

  return (
    <>
      {menuOpen && <div id="mobile-conversion-navigation" className="fixed inset-x-0 top-16 z-[70] border-b border-slate-200 bg-white p-4 shadow-xl md:hidden">
        <nav className="grid gap-2" aria-label="Mobilmeny">
          {[['funktioner', 'Funktioner'], ['flode', 'Så fungerar det'], ['pris', 'Pris'], ['faq', 'Vanliga frågor']].map(([id, label]) => <button key={id} onClick={() => scrollTo(id)} className="rounded-xl px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50">{label}</button>)}
          <Button onClick={() => openDemo('mobile_menu')} className="mt-2 h-12 rounded-xl bg-[#123b88] font-black text-white hover:bg-[#0f2f6e]">Boka demo</Button>
          <a href="/login" className="rounded-xl px-4 py-3 text-center text-sm font-black text-slate-600">Logga in</a>
        </nav>
      </div>}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
        <Button onClick={() => openDemo('mobile_sticky')} className="h-12 w-full rounded-xl bg-[#123b88] text-base font-black text-white hover:bg-[#0f2f6e]">Boka kostnadsfri demo <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
      {demoOpen && <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-demo-title">
        <div className="mx-auto mt-8 max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><h2 id="mobile-demo-title" className="text-2xl font-black text-slate-950">Boka 15 min demo</h2><p className="mt-2 text-sm leading-6 text-slate-600">Fyra korta fält. Vi återkommer och bekräftar en tid.</p></div>
            <button onClick={() => setDemoOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Stäng demoformulär"><X className="h-5 w-5" /></button></div>
          <div className="mt-6"><DemoLeadForm source="mobile_demo" /></div>
        </div>
      </div>}
    </>
  );
}
