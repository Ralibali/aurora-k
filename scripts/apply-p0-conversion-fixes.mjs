#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname, '..');

function filePath(relativePath) {
  return resolve(root, relativePath);
}

function read(relativePath) {
  return readFileSync(filePath(relativePath), 'utf8');
}

function write(relativePath, content) {
  writeFileSync(filePath(relativePath), content, 'utf8');
}

function replaceOnce(content, from, to, label) {
  if (content.includes(to)) return content;
  if (!content.includes(from)) {
    throw new Error(`Kunde inte hitta mönster för ${label}`);
  }
  return content.replace(from, to);
}

function replaceAllRequired(content, from, to, label) {
  if (!content.includes(from)) {
    if (content.includes(to)) return content;
    throw new Error(`Kunde inte hitta mönster för ${label}`);
  }
  return content.split(from).join(to);
}

function patch(relativePath, transform) {
  const before = read(relativePath);
  const after = transform(before);
  if (after !== before) {
    write(relativePath, after);
    console.log(`✓ ${relativePath}`);
  } else {
    console.log(`– ${relativePath} redan uppdaterad`);
  }
}

patch('src/App.tsx', (input) => {
  let content = input;
  if (!content.includes('<Route path="/boka-demo"')) {
    content = replaceOnce(
      content,
      '                <Route path="/" element={<LandingPage />} />\n                <Route path="/boka" element={<PublicBookingPage />} />',
      '                <Route path="/" element={<LandingPage />} />\n                <Route path="/boka-demo" element={<LandingPage />} />\n                <Route path="/boka" element={<PublicBookingPage />} />',
      'separat demo-route',
    );
  }
  return content;
});

patch('src/pages/LandingPageV3.tsx', (input) => {
  let content = input;

  if (!content.includes('Menu, X, PackageCheck')) {
    content = replaceOnce(
      content,
      'Menu, PackageCheck',
      'Menu, X, PackageCheck',
      'X-ikon för mobilmeny',
    );
  }

  if (content.includes("import { LeadFormModal } from '@/components/LeadFormModal';")) {
    content = content.replace(
      "import { LeadFormModal } from '@/components/LeadFormModal';",
      "import { track } from '@/lib/track';",
    );
  } else if (!content.includes("import { track } from '@/lib/track';")) {
    content = replaceOnce(
      content,
      "import { DemoBookingModal } from '@/components/DemoBookingModal';",
      "import { DemoBookingModal } from '@/components/DemoBookingModal';\nimport { track } from '@/lib/track';",
      'tracking-import',
    );
  }

  content = replaceOnce(
    content,
    "  const [leadModalOpen, setLeadModalOpen] = useState(false);\n  const [demoModalOpen, setDemoModalOpen] = useState(false);\n  const [demoLoading, setDemoLoading] = useState(false);",
    "  const [demoModalOpen, setDemoModalOpen] = useState(false);\n  const [demoLoading, setDemoLoading] = useState(false);\n  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);\n  const [demoSource, setDemoSource] = useState('landing');",
    'state för mobilmeny och demo-källa',
  );

  content = replaceOnce(
    content,
    "  useEffect(() => {\n    if (location.pathname === '/boka' || location.pathname === '/en/book') {\n      setDemoModalOpen(true);\n    }\n  }, [location.pathname]);",
    "  useEffect(() => {\n    if (location.pathname === '/boka-demo' || location.pathname === '/en/book') {\n      setDemoSource('direct_url');\n      track('demo_page_view', { page: location.pathname });\n      setDemoModalOpen(true);\n    }\n  }, [location.pathname]);",
    'direkt demo-route',
  );

  content = replaceOnce(
    content,
    "  const scrollTo = (id: string) => {\n    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  };",
    "  const scrollTo = (id: string) => {\n    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  };\n\n  const scrollToAndClose = (id: string) => {\n    scrollTo(id);\n    setMobileMenuOpen(false);\n  };\n\n  const openDemo = (source: string) => {\n    setDemoSource(source);\n    setMobileMenuOpen(false);\n    track('demo_cta_click', { source, page: location.pathname });\n    setDemoModalOpen(true);\n  };",
    'demo- och mobilhjälpare',
  );

  if (!content.includes("track('live_demo_click'")) {
    content = content.replace(
      "  const handleDemo = async () => {\n    setDemoLoading(true);",
      "  const handleDemo = async () => {\n    track('live_demo_click', { page: location.pathname });\n    setDemoLoading(true);",
    );
    content = content.replace(
      "      toast.success(t.toasts.demoSuccess(data.companyName));",
      "      track('live_demo_success', { page: location.pathname });\n      toast.success(t.toasts.demoSuccess(data.companyName));",
    );
    content = content.replace(
      "    } catch (err: any) {\n      toast.error(err.message || t.toasts.demoError);",
      "    } catch (err: any) {\n      track('live_demo_error', { page: location.pathname, message: err?.message || t.toasts.demoError });\n      toast.error(err.message || t.toasts.demoError);",
    );
  }

  content = replaceAllRequired(
    content,
    'onClick={() => setDemoModalOpen(true)}',
    "onClick={() => openDemo('landing_cta')}",
    'demo-CTA på startsidan',
  );
  content = replaceAllRequired(
    content,
    'onDemo={() => setDemoModalOpen(true)}',
    "onDemo={() => openDemo('included_section')}",
    'demo-CTA i funktionssektion',
  );

  content = replaceOnce(
    content,
    '            <Button variant="outline" size="icon" className="md:hidden" aria-label={t.nav.menu}>\n              <Menu className="h-4 w-4" />\n            </Button>',
    '            <Button\n              variant="outline"\n              size="icon"\n              className="md:hidden"\n              aria-label={mobileMenuOpen ? \'Stäng meny\' : t.nav.menu}\n              aria-expanded={mobileMenuOpen}\n              aria-controls="mobile-navigation"\n              onClick={() => setMobileMenuOpen((open) => !open)}\n            >\n              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}\n            </Button>',
    'fungerande hamburgermeny',
  );

  if (!content.includes('id="mobile-navigation"')) {
    content = replaceOnce(
      content,
      '        </div>\n      </header>\n\n      <main>',
      `        </div>\n        {mobileMenuOpen && (\n          <div id="mobile-navigation" className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden">\n            <nav className="mx-auto grid max-w-7xl gap-2" aria-label={t.nav.menu}>\n              <button onClick={() => scrollToAndClose('funktioner')} className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{t.nav.features}</button>\n              <button onClick={() => scrollToAndClose('flode')} className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{t.nav.flow}</button>\n              <button onClick={() => scrollToAndClose('pris')} className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{t.nav.pricing}</button>\n              <button onClick={() => scrollToAndClose('faq')} className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{t.nav.faq}</button>\n              <Button onClick={() => openDemo('mobile_menu')} className="mt-2 w-full rounded-xl bg-[#123b88] font-bold text-white hover:bg-[#0f2f6e]">{t.nav.bookDemo}</Button>\n              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">\n                <Link to={dashboardHref} onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700">{dashboardLabel}</Link>\n                <Link to={otherPath} hrefLang={otherLang} onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-[#123b88]">{lang === 'sv' ? t.langSwitch.en : t.langSwitch.sv}</Link>\n              </div>\n            </nav>\n          </div>\n        )}\n      </header>\n\n      <main className="pb-24 md:pb-0">`,
      'mobilmenyns innehåll',
    );
  } else {
    content = content.replace('      <main>', '      <main className="pb-24 md:pb-0">');
  }

  content = replaceOnce(
    content,
    "      <LeadFormModal open={leadModalOpen} onOpenChange={setLeadModalOpen} />\n      <DemoBookingModal open={demoModalOpen} onOpenChange={setDemoModalOpen} lang={lang} />",
    `      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">\n        <Button onClick={() => openDemo('mobile_sticky')} className="h-12 w-full rounded-xl bg-[#123b88] text-base font-black text-white hover:bg-[#0f2f6e]">\n          {t.nav.bookDemo}\n          <ArrowRight className="ml-2 h-4 w-4" />\n        </Button>\n      </div>\n      <DemoBookingModal open={demoModalOpen} onOpenChange={setDemoModalOpen} lang={lang} source={demoSource} />`,
    'fast mobil-CTA och demokälla',
  );

  return content;
});

patch('src/components/DemoBookingModal.tsx', (input) => {
  let content = input;
  content = replaceOnce(content, "import { useMemo, useState } from 'react';", "import { useEffect, useMemo, useRef, useState } from 'react';", 'React-hooks i demobokning');
  if (!content.includes("import { track } from '@/lib/track';")) {
    content = replaceOnce(content, "import type { Lang } from '@/i18n/landing';", "import type { Lang } from '@/i18n/landing';\nimport { track } from '@/lib/track';", 'tracking-import i demobokning');
  }
  content = replaceOnce(
    content,
    "interface DemoBookingModalProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  lang?: Lang;\n}",
    "interface DemoBookingModalProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  lang?: Lang;\n  source?: string;\n}",
    'source-prop i demobokning',
  );
  content = replaceOnce(
    content,
    "export function DemoBookingModal({ open, onOpenChange, lang = 'sv' }: DemoBookingModalProps) {",
    "export function DemoBookingModal({ open, onOpenChange, lang = 'sv', source = 'unknown' }: DemoBookingModalProps) {",
    'source i funktionssignatur',
  );
  content = replaceOnce(
    content,
    "  const update = (field: keyof typeof form, value: string) =>\n    setForm((prev) => ({ ...prev, [field]: value }));",
    "  const startedRef = useRef(false);\n\n  useEffect(() => {\n    if (!open) return;\n    startedRef.current = false;\n    track('demo_modal_open', { source, page: window.location.pathname });\n  }, [open, source]);\n\n  const update = (field: keyof typeof form, value: string) => {\n    if (!startedRef.current) {\n      startedRef.current = true;\n      track('demo_form_start', { source, first_field: field, page: window.location.pathname });\n    }\n    setForm((prev) => ({ ...prev, [field]: value }));\n  };",
    'startmätning i demobokning',
  );
  content = replaceOnce(
    content,
    "    if (!parsed.success) {\n      const flat = parsed.error.flatten().fieldErrors;\n      if (flat.email?.length) toast.error(copy.invalidEmail);\n      else toast.error(copy.fillRequired);\n      return;\n    }\n\n    setSubmitting(true);",
    "    if (!parsed.success) {\n      const flat = parsed.error.flatten().fieldErrors;\n      const field = flat.email?.length ? 'email' : Object.keys(flat)[0] || 'required';\n      track('demo_validation_error', { source, field, page: window.location.pathname });\n      if (flat.email?.length) toast.error(copy.invalidEmail);\n      else toast.error(copy.fillRequired);\n      return;\n    }\n\n    track('demo_submit_attempt', { source, page: window.location.pathname });\n    setSubmitting(true);",
    'validerings- och submitmätning',
  );
  content = replaceOnce(
    content,
    "    if (error) {\n      toast.error(copy.error);\n      return;\n    }",
    "    if (error) {\n      track('demo_submit_error', { source, message: error.message, page: window.location.pathname });\n      toast.error(copy.error);\n      return;\n    }",
    'felmätning i demobokning',
  );
  content = replaceOnce(
    content,
    "    try { (await import('@/lib/track')).track('demo_booking_submit', { has_date: Boolean(form.preferred_date), has_slot: Boolean(form.preferred_slot), has_phone: Boolean(form.phone) }); } catch { /* noop */ }\n    setSubmitted(true);",
    "    const hasDate = Boolean(form.preferred_date && form.preferred_date !== FLEXIBLE);\n    const hasSlot = Boolean(form.preferred_slot && form.preferred_slot !== FLEXIBLE);\n    track('demo_submit_success', { source, has_date: hasDate, has_slot: hasSlot, has_phone: Boolean(form.phone), page: window.location.pathname });\n    track('generate_lead', { currency: 'SEK', value: 0, lead_source: source });\n    setSubmitted(true);",
    'lyckad konverteringsmätning',
  );
  if (!content.includes('startedRef.current = false;\n      // reset on close')) {
    content = content.replace(
      "    if (!next) {\n      // reset on close so reopening starts clean",
      "    if (!next) {\n      startedRef.current = false;\n      // reset on close so reopening starts clean",
    );
  }
  return content;
});

patch('src/components/LeadForm.tsx', (input) => {
  let content = input;
  content = replaceOnce(content, "import { useState } from 'react';", "import { useRef, useState } from 'react';", 'useRef i leadformulär');
  if (!content.includes("import { track } from '@/lib/track';")) {
    content = replaceOnce(content, "import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { track } from '@/lib/track';", 'tracking-import i leadformulär');
  }
  content = replaceOnce(
    content,
    "interface LeadFormProps {\n  onSuccess?: () => void;\n  compact?: boolean;\n}",
    "interface LeadFormProps {\n  onSuccess?: () => void;\n  compact?: boolean;\n  source?: string;\n}",
    'source-prop i leadformulär',
  );
  content = replaceOnce(
    content,
    "export function LeadForm({ onSuccess, compact = false }: LeadFormProps) {",
    "export function LeadForm({ onSuccess, compact = false, source = 'lead_form' }: LeadFormProps) {",
    'source i leadformulär',
  );
  content = replaceOnce(
    content,
    "  const handleChange = (field: string, value: string) => {\n    setForm((prev) => ({ ...prev, [field]: value }));\n  };",
    "  const startedRef = useRef(false);\n\n  const handleChange = (field: string, value: string) => {\n    if (!startedRef.current) {\n      startedRef.current = true;\n      track('lead_form_start', { source, first_field: field, page: window.location.pathname });\n    }\n    setForm((prev) => ({ ...prev, [field]: value }));\n  };",
    'startmätning i leadformulär',
  );
  content = replaceOnce(
    content,
    "    if (!form.company_name.trim() || !form.contact_person.trim() || !form.email.trim()) {\n      toast.error('Fyll i företagsnamn, namn och e-post');\n      return;\n    }\n    setSubmitting(true);",
    "    if (!form.company_name.trim() || !form.contact_person.trim() || !form.email.trim()) {\n      track('lead_validation_error', { source, page: window.location.pathname });\n      toast.error('Fyll i företagsnamn, namn och e-post');\n      return;\n    }\n    track('lead_submit_attempt', { source, page: window.location.pathname });\n    setSubmitting(true);",
    'validering i leadformulär',
  );
  content = content.replace(
    "      try { (await import('@/lib/track')).track('lead_submit_error', { message: error.message }); } catch { /* noop */ }",
    "      track('lead_submit_error', { source, message: error.message, page: window.location.pathname });",
  );
  content = content.replace(
    "    try { (await import('@/lib/track')).track('lead_submit_success', { fleet_size: form.fleet_size || 'unspecified', has_phone: Boolean(form.phone), lead_score: leadScore }); } catch { /* noop */ }",
    "    track('lead_submit_success', { source, fleet_size: form.fleet_size || 'unspecified', has_phone: Boolean(form.phone), lead_score: leadScore, page: window.location.pathname });\n    track('generate_lead', { currency: 'SEK', value: 0, lead_source: source });",
  );
  return content;
});

patch('src/components/LeadFormModal.tsx', (input) => {
  let content = input;
  if (!content.includes("import { useEffect } from 'react';")) {
    content = "import { useEffect } from 'react';\n" + content;
  }
  if (!content.includes("import { track } from '@/lib/track';")) {
    content = content.replace("import { LeadForm } from './LeadForm';", "import { LeadForm } from './LeadForm';\nimport { track } from '@/lib/track';");
  }
  content = replaceOnce(
    content,
    "interface LeadFormModalProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n}",
    "interface LeadFormModalProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  source?: string;\n}",
    'source-prop i leadmodal',
  );
  content = replaceOnce(
    content,
    "export function LeadFormModal({ open, onOpenChange }: LeadFormModalProps) {\n  return (",
    "export function LeadFormModal({ open, onOpenChange, source = 'lead_modal' }: LeadFormModalProps) {\n  useEffect(() => {\n    if (open) track('lead_modal_open', { source, page: window.location.pathname });\n  }, [open, source]);\n\n  return (",
    'öppningsmätning i leadmodal',
  );
  content = replaceOnce(
    content,
    '<LeadForm compact onSuccess={() => setTimeout(() => onOpenChange(false), 4000)} />',
    '<LeadForm compact source={source} onSuccess={() => setTimeout(() => onOpenChange(false), 4000)} />',
    'source vidare till leadformulär',
  );
  return content;
});

for (const [relativePath, source] of [
  ['src/pages/TransportplaneringPage.tsx', 'transportplanering'],
  ['src/pages/DigitalFoljesedelPage.tsx', 'digital_foljesedel'],
]) {
  patch(relativePath, (input) => {
    let content = input.replace("track('cta_click', { cta: 'book_demo'", "track('demo_cta_click', { cta: 'book_demo'");
    content = content.replace(
      '<LeadFormModal open={open} onOpenChange={setOpen} />',
      `<LeadFormModal open={open} onOpenChange={setOpen} source="${source}" />`,
    );
    return content;
  });
}

patch('src/pages/PublicBookingPage.tsx', (input) => {
  let content = input;
  content = replaceOnce(content, "import { useMemo, useState } from 'react';", "import { useMemo, useRef, useState } from 'react';", 'useRef i transportbokning');
  if (!content.includes("import { track } from '@/lib/track';")) {
    content = replaceOnce(content, "import { supabase } from '@/integrations/supabase/client';", "import { supabase } from '@/integrations/supabase/client';\nimport { track } from '@/lib/track';", 'tracking-import i transportbokning');
  }
  content = replaceOnce(
    content,
    "  const [orderNumber, setOrderNumber] = useState('');\n\n  const update = (key: keyof FormState, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));",
    "  const [orderNumber, setOrderNumber] = useState('');\n  const startedRef = useRef(false);\n\n  const update = (key: keyof FormState, value: string | boolean) => {\n    if (!startedRef.current) {\n      startedRef.current = true;\n      track('transport_booking_form_start', { first_field: key, brand: brand.name, page: window.location.pathname });\n    }\n    setForm(prev => ({ ...prev, [key]: value }));\n  };",
    'startmätning i transportbokning',
  );
  content = replaceOnce(
    content,
    "    if (!form.serviceType || !form.pickupAddress || !form.preferredDate || !form.contactName || !form.phone || !form.email || !form.cargo) {\n      toast.error('Fyll i alla obligatoriska fält');\n      return;\n    }\n\n    setIsSubmitting(true);",
    "    if (!form.serviceType || !form.pickupAddress || !form.preferredDate || !form.contactName || !form.phone || !form.email || !form.cargo) {\n      track('transport_booking_validation_error', { brand: brand.name, page: window.location.pathname });\n      toast.error('Fyll i alla obligatoriska fält');\n      return;\n    }\n\n    track('transport_booking_submit_attempt', { brand: brand.name, has_files: files.length > 0, page: window.location.pathname });\n    setIsSubmitting(true);",
    'submitmätning i transportbokning',
  );
  content = replaceOnce(
    content,
    "      setOrderNumber(number);\n      toast.success('Förfrågan skickad!');",
    "      track('transport_booking_submit_success', { brand: brand.name, service_type: form.serviceType, urgent: form.urgent, has_files: files.length > 0, page: window.location.pathname });\n      setOrderNumber(number);\n      toast.success('Förfrågan skickad!');",
    'lyckad transportbokning',
  );
  content = replaceOnce(
    content,
    "    } catch (error: any) {\n      toast.error(error?.message || 'Kunde inte skicka förfrågan');",
    "    } catch (error: any) {\n      track('transport_booking_submit_error', { brand: brand.name, message: error?.message || 'unknown', page: window.location.pathname });\n      toast.error(error?.message || 'Kunde inte skicka förfrågan');",
    'felmätning i transportbokning',
  );
  return content;
});

patch('src/components/QuickContactButton.tsx', (input) =>
  replaceOnce(
    input,
    '"fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full",',
    '"fixed bottom-5 right-5 z-40 hidden sm:flex items-center gap-2 rounded-full",',
    'en enda mobil-CTA',
  ),
);

for (const relativePath of [
  'src/pages/TidrapporteringTransportPage.tsx',
  'src/pages/VadKostarTransportledningssystemPage.tsx',
]) {
  patch(relativePath, (input) => replaceAllRequired(input, 'to="/boka"', 'to="/boka-demo"', `demo-länkar i ${relativePath}`));
}

const migrationPath = 'supabase/migrations/20260625000100_public_booking_requests_insert_policy.sql';
if (!existsSync(filePath(migrationPath))) {
  write(migrationPath, `-- Säkerställer att utloggade besökare kan skicka transportförfrågningar.\n-- Läsning och administration förblir skyddad av befintliga policies.\n\nalter table public.booking_requests enable row level security;\n\ndrop policy if exists "Public can create booking requests" on public.booking_requests;\n\ncreate policy "Public can create booking requests"\non public.booking_requests\nfor insert\nto anon, authenticated\nwith check (\n  status = 'pending'\n  and customer_name is not null\n  and length(trim(customer_name)) between 2 and 160\n  and title is not null\n  and length(trim(title)) between 2 and 220\n  and (customer_email is null or length(trim(customer_email)) <= 254)\n  and (customer_phone is null or length(trim(customer_phone)) <= 60)\n  and (preferred_date is null or preferred_date >= (current_date - interval '1 day'))\n  and (description is null or length(description) <= 6000)\n);\n\ncomment on policy "Public can create booking requests" on public.booking_requests is\n  'Allows anonymous website visitors to submit transport booking requests with basic validation.';\n`);
  console.log(`✓ ${migrationPath}`);
}

// P0-verifiering som stoppar CI om en central fix saknas.
const app = read('src/App.tsx');
const landing = read('src/pages/LandingPageV3.tsx');
const demo = read('src/components/DemoBookingModal.tsx');
const publicBooking = read('src/pages/PublicBookingPage.tsx');
const tidrapport = read('src/pages/TidrapporteringTransportPage.tsx');
const pris = read('src/pages/VadKostarTransportledningssystemPage.tsx');

const checks = [
  [app.includes('path="/boka-demo"'), 'Separat /boka-demo-route saknas'],
  [app.includes('path="/boka" element={<PublicBookingPage />}'), 'Transportbokningen har tappat /boka'],
  [landing.includes('id="mobile-navigation"'), 'Mobilmenyn saknas'],
  [landing.includes("openDemo('mobile_sticky')"), 'Fast mobil-CTA saknas'],
  [landing.includes("location.pathname === '/boka-demo'"), 'Direkt demo-route öppnar inte modal'],
  [demo.includes("track('demo_form_start'"), 'Demo form-start mäts inte'],
  [demo.includes("track('demo_submit_error'"), 'Demo submit-fel mäts inte'],
  [demo.includes("track('demo_submit_success'"), 'Demo submit-success mäts inte'],
  [demo.includes("track('generate_lead'"), 'GA4 generate_lead saknas'],
  [publicBooking.includes("track('transport_booking_submit_success'"), 'Transportbokningens success mäts inte'],
  [!tidrapport.includes('to="/boka"'), 'Fel /boka-länk finns kvar på tidrapporteringssidan'],
  [!pris.includes('to="/boka"'), 'Fel /boka-länk finns kvar på prissidan'],
  [existsSync(filePath(migrationPath)), 'RLS-migration för utloggad transportbokning saknas'],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  throw new Error(failed.map(([, message]) => message).join('\n'));
}

console.log('\n✓ Alla P0-kontroller passerade.');
