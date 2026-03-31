import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && role) {
      if (role === 'admin') navigate('/admin', { replace: true });
      else navigate('/driver', { replace: true });
    }
  }, [loading, session, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error('Inloggningen misslyckades: ' + error.message);
      setSubmitting(false);
      return;
    }

    toast.success('Välkommen!');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-success/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <Truck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Aurora Medias Transport</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Logga in för att fortsätta</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 backdrop-blur-sm p-6 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sidebar-foreground/80 text-sm font-medium">
                E-post
              </Label>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sidebar-foreground/80 text-sm font-medium">
                  Lösenord
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Glömt lösenord?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/40" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-primary h-11"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
              disabled={submitting}
            >
              {submitting ? 'Loggar in...' : 'Logga in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-sidebar-foreground/40 mt-6">
          © {new Date().getFullYear()} Aurora Medias Transport
        </p>
      </div>
    </div>
  );
}