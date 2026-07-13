import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, User, Mail, Phone, Hash, Truck, Send, CircleCheck as CheckCircle2, Clock, Mail as MailIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

// Beräknar nästa rimliga återkopplingstid (vardag 09–17, Europe/Stockholm-känsla via lokal tid)
function getResponseEta(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = sön, 6 = lör
  const hour = now.getHours();

  // Vardag inom kontorstid -> snabbt svar
  if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
    return 'Vi hör av oss inom 2 timmar — oftast snabbare.';
  }
  // Vardag tidig morgon
  if (day >= 1 && day <= 5 && hour < 9) {
    return 'Vi hör av oss idag innan kl. 11:00.';
  }
  // Vardag kväll
  if (day >= 1 && day <= 5 && hour >= 17) {
    return 'Vi hör av oss imorgon förmiddag, senast kl. 11:00.';
  }
  // Lördag
  if (day === 6) {
    return 'Vi hör av oss på måndag morgon, senast kl. 10:00.';
  }
  // Söndag
  return 'Vi hör av oss imorgon (måndag) senast kl. 10:00.';
}

export function LeadForm({ onSuccess, compact = false }: LeadFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    org_number: '',
    fleet_size: '',
    message: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate lead score based on fleet size and completeness
  const calcLeadScore = (data: typeof form): number => {
    let score = 0;
    if (data.phone.trim()) score += 10;
    if (data.org_number.trim()) score += 10;
    if (data.message.trim()) score += 5;
    const fleet = data.fleet_size.trim().toLowerCase();
    const fleetNum = parseInt(fleet, 10);
    if (!isNaN(fleetNum)) {
      if (fleetNum >= 20) score += 30;
      else if (fleetNum >= 10) score += 20;
      else if (fleetNum >= 5) score += 10;
      else score += 5;
    }
    return score;
  };

  // Extract UTM params from URL
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
    if (!form.company_name.trim() || !form.contact_person.trim() || !form.email.trim()) {
      toast.error('Fyll i företagsnamn, namn och e-post');
      return;
    }
    setSubmitting(true);
    const utmParams = getUtmParams();
    const leadScore = calcLeadScore(form);
    const { error } = await supabase.from('leads').insert({
      company_name: form.company_name.trim(),
      contact_person: form.contact_person.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      org_number: form.org_number.trim() || null,
      fleet_size: form.fleet_size.trim() || null,
      message: form.message.trim() || null,
      ...utmParams,
      lead_score: leadScore,
    });
    setSubmitting(false);
    if (error) {
      try { (await import('@/lib/track')).track('lead_submit_error', { message: error.message }); } catch { /* noop */ }
      toast.error('Något gick fel. Försök igen.');
      return;
    }

    // Send admin notification email (fire and forget)
    supabase.functions.invoke('send-email', {
      body: {
        to: 'info@auroramedia.se',
        templateName: 'new-lead-notification',
        templateData: {
          companyName: form.company_name.trim(),
          contactPerson: form.contact_person.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          fleetSize: form.fleet_size.trim() || null,
          message: form.message.trim() || null,
        },
      },
    }).catch((err) => console.warn('Failed to send lead notification:', err));

    setSubmitted(true);
    try {
      const { trackEvent } = await import('@/lib/analytics');
      trackEvent('Demo Requested', { source: 'lead_form' });
    } catch { /* noop */ }
    toast.success('Tack! Vi hör av oss inom kort.');
    onSuccess?.();
  };

  if (submitted) {
    const eta = getResponseEta();
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="py-6 space-y-5 text-center"
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
          <h3 className="text-xl font-semibold text-foreground">
            Tack {form.contact_person.split(' ')[0] || 'så mycket'} — vi hörs snart!
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Din intresseanmälan har landat hos oss. En riktig människa — inte en robot —
            läser igenom den och hör av sig personligen för en kort, förutsättningslös pratstund.
          </p>
        </div>

        <div className="mx-auto max-w-sm rounded-lg border border-border bg-secondary/40 p-4 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Beräknad återkoppling</p>
              <p className="text-sm text-muted-foreground">{eta}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MailIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Bekräftelse på väg</p>
              <p className="text-sm text-muted-foreground">
                Kolla {form.email || 'din inkorg'} (och skräpposten, för säkerhets skull).
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Under tiden — luta dig tillbaka. Vi tar det härifrån.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={compact ? 'space-y-3' : 'grid sm:grid-cols-2 gap-4'}>
        <div className="space-y-1.5">
          <Label htmlFor="lead-company" className="text-sm flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Företagsnamn <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-company"
            value={form.company_name}
            onChange={(e) => handleChange('company_name', e.target.value)}
            placeholder="Ert företagsnamn"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-person" className="text-sm flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Kontaktperson <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-person"
            value={form.contact_person}
            onChange={(e) => handleChange('contact_person', e.target.value)}
            placeholder="Ditt namn"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email" className="text-sm flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            E-post <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="namn@foretag.se"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-phone" className="text-sm flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            Telefon
          </Label>
          <Input
            id="lead-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="070-123 45 67"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-org" className="text-sm flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            Org.nummer
          </Label>
          <Input
            id="lead-org"
            value={form.org_number}
            onChange={(e) => handleChange('org_number', e.target.value)}
            placeholder="556000-0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-fleet" className="text-sm flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            Antal fordon/förare
          </Label>
          <Input
            id="lead-fleet"
            value={form.fleet_size}
            onChange={(e) => handleChange('fleet_size', e.target.value)}
            placeholder="t.ex. 5 bilar, 8 förare"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-message" className="text-sm">Meddelande</Label>
        <Textarea
          id="lead-message"
          value={form.message}
          onChange={(e) => handleChange('message', e.target.value)}
          placeholder="Berätta kort om era behov..."
          rows={compact ? 2 : 3}
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? 'Skickar...' : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Skicka intresseanmälan
          </>
        )}
      </Button>
    </form>
  );
}
