import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 0 && !submitted && !sessionStorage.getItem('exit_popup_shown')) {
      setOpen(true);
      sessionStorage.setItem('exit_popup_shown', '1');
    }
  }, [submitted]);

  useEffect(() => {
    document.addEventListener('mouseout', handleMouseLeave);
    return () => document.removeEventListener('mouseout', handleMouseLeave);
  }, [handleMouseLeave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert({
        company_name: '(exit-intent)',
        contact_person: email.split('@')[0],
        email,
        phone: phone || null,
        message: 'Exit-intent popup – vill testa gratis',
        utm_source: 'exit-intent',
        utm_medium: 'popup',
        lead_score: 3,
      });

      if (error) throw error;

      // Fire-and-forget admin notification
      supabase.functions
        .invoke('send-email', {
          body: {
            templateName: 'new-lead-notification',
            templateData: {
              companyName: '(exit-intent)',
              contactPerson: email.split('@')[0],
              email,
              phone: phone || null,
              message: 'Exit intent-lead',
            },
          },
        })
        .catch((err) => console.warn('Failed to send exit-intent lead notification:', err));

      setSubmitted(true);
      toast.success('Tack! Vi hör av oss inom kort.');
      setTimeout(() => setOpen(false), 2000);
    } catch {
      toast.error('Något gick fel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render on admin/driver routes
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/driver'))) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">Vänta – prova gratis i 14 dagar!</DialogTitle>
          </div>
          <DialogDescription>
            Testa Aurora Transport utan kostnad. Inga krav, ingen bindningstid.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6">
            <p className="text-lg font-semibold text-primary">🎉 Tack!</p>
            <p className="text-muted-foreground">Vi kontaktar dig inom kort med dina inloggningsuppgifter.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exit-email">E-post *</Label>
              <Input
                id="exit-email"
                type="email"
                placeholder="din@epost.se"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit-phone">Telefon</Label>
              <Input
                id="exit-phone"
                type="tel"
                placeholder="070-123 45 67"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Skickar...' : 'Starta gratis provperiod'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Ingen betalning krävs. Avsluta när du vill.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
