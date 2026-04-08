import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, User, Mail, Phone, Hash, Truck, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadFormProps {
  onSuccess?: () => void;
  compact?: boolean;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.contact_person.trim() || !form.email.trim()) {
      toast.error('Fyll i företagsnamn, namn och e-post');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('leads').insert({
      company_name: form.company_name.trim(),
      contact_person: form.contact_person.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      org_number: form.org_number.trim() || null,
      fleet_size: form.fleet_size.trim() || null,
      message: form.message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Något gick fel. Försök igen.');
      console.error('[LeadForm]', error);
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
    }).catch((err) => console.error('[LeadForm] email notification failed:', err));

    setSubmitted(true);
    toast.success('Tack! Vi hör av oss inom kort.');
    onSuccess?.();
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 space-y-3"
      >
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">Tack för ditt intresse!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Vi har tagit emot din intresseanmälan och kontaktar dig inom kort för att berätta mer.
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
