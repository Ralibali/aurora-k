import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Lösenorden matchar inte'); return; }
    if (password.length < 6) { toast.error('Lösenordet måste vara minst 6 tecken'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error('Kunde inte uppdatera lösenord: ' + error.message); setSubmitting(false); return; }
    toast.success('Lösenordet har uppdaterats!');
    navigate('/', { replace: true });
  };

  const content = !ready ? (
    <p className="text-sm text-sidebar-foreground/60 text-center py-8">Verifierar återställningslänk...</p>
  ) : (
    <form onSubmit={handleReset} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sidebar-foreground/80 text-sm font-medium">Nytt lösenord</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/40" />
          <Input id="password" type="password" placeholder="Minst 6 tecken" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            className="pl-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-primary h-11" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-sidebar-foreground/80 text-sm font-medium">Bekräfta lösenord</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/40" />
          <Input id="confirm" type="password" placeholder="Upprepa lösenordet" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6}
            className="pl-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-primary h-11" />
        </div>
      </div>
      <Button type="submit" className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20" disabled={submitting}>
        {submitting ? 'Uppdaterar...' : 'Spara nytt lösenord'}
      </Button>
    </form>
  );

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
          <h1 className="text-2xl font-bold text-sidebar-foreground">Nytt lösenord</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Ange ditt nya lösenord nedan</p>
        </div>
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 backdrop-blur-sm p-6 shadow-xl">
          {content}
        </div>
        <p className="text-center text-xs text-sidebar-foreground/40 mt-6">© {new Date().getFullYear()} Aurora Medias Transport</p>
      </div>
    </div>
  );
}
