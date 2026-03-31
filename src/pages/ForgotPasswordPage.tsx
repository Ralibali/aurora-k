import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error('Kunde inte skicka: ' + error.message);
      setSubmitting(false);
      return;
    }
    setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-success/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <Truck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Glömt lösenord</h1>
          {!sent && (
            <p className="text-sm text-sidebar-foreground/60 mt-1">
              Ange din e-post så skickar vi en återställningslänk
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 backdrop-blur-sm p-6 shadow-xl">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
              <p className="text-sm text-sidebar-foreground/70">
                Om kontot finns har vi skickat ett e-postmeddelande till <strong className="text-sidebar-foreground">{email}</strong> med en länk för att återställa lösenordet.
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full touch-target border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka till inloggning
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sidebar-foreground/80 text-sm font-medium">E-post</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="namn@aurora.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-primary h-11"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20" disabled={submitting}>
                {submitting ? 'Skickar...' : 'Skicka återställningslänk'}
              </Button>
              <Link to="/" className="block text-center text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
                <ArrowLeft className="inline h-3 w-3 mr-1" /> Tillbaka till inloggning
              </Link>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-sidebar-foreground/40 mt-6">
          © {new Date().getFullYear()} Aurora Medias Transport
        </p>
      </div>
    </div>
  );
}
