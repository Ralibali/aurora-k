import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Glömt lösenord</CardTitle>
          {!sent && (
            <p className="text-sm text-muted-foreground">
              Ange din e-post så skickar vi en återställningslänk
            </p>
          )}
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <p className="text-sm text-muted-foreground">
                Om kontot finns har vi skickat ett e-postmeddelande till <strong>{email}</strong> med en länk för att återställa lösenordet.
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full touch-target">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka till inloggning
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="namn@aurora.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full touch-target" disabled={submitting}>
                {submitting ? 'Skickar...' : 'Skicka återställningslänk'}
              </Button>
              <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="inline h-3 w-3 mr-1" /> Tillbaka till inloggning
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
