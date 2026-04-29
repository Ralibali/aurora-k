import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User, Mail, Phone, CalendarClock, CheckCircle2, Send, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Lang } from '@/i18n/landing';

interface DemoBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang?: Lang;
}

const FLEXIBLE = '__flexible__';

type Slot = 'morning' | 'lunch' | 'afternoon' | 'late';

const slotsCopy: Record<Lang, Record<Slot, string>> = {
  sv: {
    morning: 'Förmiddag (09:00–11:00)',
    lunch: 'Lunch (11:00–13:00)',
    afternoon: 'Eftermiddag (13:00–15:00)',
    late: 'Sen eftermiddag (15:00–17:00)',
  },
  en: {
    morning: 'Morning (09:00–11:00)',
    lunch: 'Lunch (11:00–13:00)',
    afternoon: 'Afternoon (13:00–15:00)',
    late: 'Late afternoon (15:00–17:00)',
  },
};

const t = {
  sv: {
    title: 'Boka 15 min demo',
    description: 'Vi visar Aurora Transport live och svarar på dina frågor. Helt förutsättningslöst.',
    name: 'Ditt namn',
    namePh: 'För- och efternamn',
    company: 'Företag',
    companyPh: 'Företagsnamn',
    email: 'E-post',
    emailPh: 'namn@foretag.se',
    phone: 'Telefon (valfritt)',
    phonePh: '070-123 45 67',
    day: 'Önskad dag',
    dayPlaceholder: 'Välj dag',
    slot: 'Tidsfönster',
    slotPlaceholder: 'Välj tid eller låt oss föreslå',
    flexible: 'Lämna tid — föreslå själva',
    submit: 'Boka demo',
    submitting: 'Skickar...',
    required: '*',
    successTitle: 'Tack — bokningen är mottagen!',
    successText: 'En riktig människa läser igenom och hör av sig för att bekräfta din tid.',
    etaLabel: 'Vi bekräftar via e-post',
    etaText: 'inom kort, oftast samma vardag.',
    close: 'Stäng',
    today: 'Idag',
    tomorrow: 'Imorgon',
    fillRequired: 'Fyll i namn, företag och e-post.',
    invalidEmail: 'Ange en giltig e-postadress.',
    error: 'Något gick fel. Försök igen.',
    flexibleNote: 'Vi återkommer med 2–3 förslag på tider.',
    weekdays: ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'],
  },
  en: {
    title: 'Book a 15 min demo',
    description: 'We will walk you through Aurora Transport live and answer your questions. No strings attached.',
    name: 'Your name',
    namePh: 'First and last name',
    company: 'Company',
    companyPh: 'Company name',
    email: 'Email',
    emailPh: 'name@company.com',
    phone: 'Phone (optional)',
    phonePh: '+46 70 123 45 67',
    day: 'Preferred day',
    dayPlaceholder: 'Pick a day',
    slot: 'Time window',
    slotPlaceholder: 'Pick a slot or let us suggest',
    flexible: 'Flexible — please suggest a time',
    submit: 'Book demo',
    submitting: 'Sending...',
    required: '*',
    successTitle: 'Thanks — your booking is in!',
    successText: 'A real person will read it and reach out to confirm your slot.',
    etaLabel: 'We confirm by email',
    etaText: 'shortly — usually the same business day.',
    close: 'Close',
    today: 'Today',
    tomorrow: 'Tomorrow',
    fillRequired: 'Please fill in name, company and email.',
    invalidEmail: 'Please provide a valid email.',
    error: 'Something went wrong. Please try again.',
    flexibleNote: 'We will come back with 2–3 suggested times.',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
} as const;

const schema = z.object({
  contact_person: z.string().trim().min(1).max(100),
  company_name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  preferred_date: z.string().trim().max(20).optional().or(z.literal('')),
  preferred_slot: z.string().trim().max(40).optional().or(z.literal('')),
});

function buildDayOptions(lang: Lang): { value: string; label: string }[] {
  const copy = t[lang];
  const days: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue; // skip weekends
    const dateStr = d.toISOString().slice(0, 10);
    let label: string;
    if (i === 0) label = copy.today;
    else if (i === 1) label = copy.tomorrow;
    else label = `${copy.weekdays[wd]} ${d.getDate()}/${d.getMonth() + 1}`;
    days.push({ value: dateStr, label });
    if (days.length >= 7) break;
  }
  return days;
}

export function DemoBookingModal({ open, onOpenChange, lang = 'sv' }: DemoBookingModalProps) {
  const copy = t[lang];
  const slots = slotsCopy[lang];
  const dayOptions = useMemo(() => buildDayOptions(lang), [lang]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    contact_person: '',
    company_name: '',
    email: '',
    phone: '',
    preferred_date: FLEXIBLE,
    preferred_slot: FLEXIBLE,
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const buildMessage = (): string => {
    const lines: string[] = [];
    lines.push(lang === 'sv' ? 'Demobokning från landningssidan.' : 'Demo booking from landing page.');
    if (form.preferred_date && form.preferred_date !== FLEXIBLE) {
      const dayLabel = dayOptions.find((d) => d.value === form.preferred_date)?.label ?? form.preferred_date;
      lines.push((lang === 'sv' ? 'Önskad dag: ' : 'Preferred day: ') + `${dayLabel} (${form.preferred_date})`);
    } else {
      lines.push(lang === 'sv' ? 'Önskad dag: Flexibel' : 'Preferred day: Flexible');
    }
    if (form.preferred_slot && form.preferred_slot !== FLEXIBLE) {
      lines.push((lang === 'sv' ? 'Tidsfönster: ' : 'Time window: ') + slots[form.preferred_slot as Slot]);
    } else {
      lines.push(lang === 'sv' ? 'Tidsfönster: Lämnar till oss' : 'Time window: Let us suggest');
    }
    lines.push((lang === 'sv' ? 'Språk: ' : 'Language: ') + lang.toUpperCase());
    return lines.join('\n');
  };

  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_content: params.get('utm_content') || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      if (flat.email?.length) toast.error(copy.invalidEmail);
      else toast.error(copy.fillRequired);
      return;
    }

    setSubmitting(true);
    const message = buildMessage();
    const utm = getUtmParams();

    const { error } = await supabase.from('leads').insert({
      contact_person: parsed.data.contact_person,
      company_name: parsed.data.company_name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message,
      ...utm,
      lead_score: 25, // demo bookings are warm
    } as any);

    setSubmitting(false);
    if (error) {
      console.error('[DemoBookingModal]', error);
      toast.error(copy.error);
      return;
    }

    supabase.functions
      .invoke('send-email', {
        body: {
          to: 'info@auroramedia.se',
          templateName: 'new-lead-notification',
          templateData: {
            companyName: parsed.data.company_name,
            contactPerson: parsed.data.contact_person,
            email: parsed.data.email,
            phone: parsed.data.phone || null,
            message,
          },
        },
      })
      .catch((err) => console.error('[DemoBookingModal] notify failed:', err));

    setSubmitted(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // reset on close so reopening starts clean
      setTimeout(() => {
        setSubmitted(false);
        setForm({
          contact_person: '',
          company_name: '',
          email: '',
          phone: '',
          preferred_date: FLEXIBLE,
          preferred_slot: FLEXIBLE,
        });
      }, 200);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="py-4 space-y-5 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 14 }}
              className="relative mx-auto h-16 w-16"
            >
              <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              </div>
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{copy.successTitle}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {copy.successText}
              </p>
            </div>
            <div className="mx-auto max-w-sm rounded-lg border border-border bg-secondary/40 p-4 text-left">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{copy.etaLabel}</p>
                  <p className="text-sm text-muted-foreground">{copy.etaText}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {form.preferred_date === FLEXIBLE ? copy.flexibleNote : ''}
            </p>
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full">
              {copy.close}
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="demo-name" className="text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {copy.name} <span className="text-destructive">{copy.required}</span>
                </Label>
                <Input
                  id="demo-name"
                  value={form.contact_person}
                  onChange={(e) => update('contact_person', e.target.value)}
                  placeholder={copy.namePh}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-company" className="text-sm flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {copy.company} <span className="text-destructive">{copy.required}</span>
                </Label>
                <Input
                  id="demo-company"
                  value={form.company_name}
                  onChange={(e) => update('company_name', e.target.value)}
                  placeholder={copy.companyPh}
                  required
                  maxLength={150}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-email" className="text-sm flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {copy.email} <span className="text-destructive">{copy.required}</span>
                </Label>
                <Input
                  id="demo-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder={copy.emailPh}
                  required
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-phone" className="text-sm flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {copy.phone}
                </Label>
                <Input
                  id="demo-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder={copy.phonePh}
                  maxLength={40}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  {copy.day}
                </Label>
                <Select value={form.preferred_date} onValueChange={(v) => update('preferred_date', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy.dayPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FLEXIBLE}>{copy.flexible}</SelectItem>
                    {dayOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {copy.slot}
                </Label>
                <Select value={form.preferred_slot} onValueChange={(v) => update('preferred_slot', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy.slotPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FLEXIBLE}>{copy.flexible}</SelectItem>
                    <SelectItem value="morning">{slots.morning}</SelectItem>
                    <SelectItem value="lunch">{slots.lunch}</SelectItem>
                    <SelectItem value="afternoon">{slots.afternoon}</SelectItem>
                    <SelectItem value="late">{slots.late}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                copy.submitting
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {copy.submit}
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
