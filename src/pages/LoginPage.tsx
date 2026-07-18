import { useState, useEffect } from 'react';
import { usePageMeta } from '@/lib/use-page-meta';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Mail, Lock, Play, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, role, isPlatformAdmin, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async (type: 'akeri' | 'bemanning') => {
    setDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login', { body: { type } });
      if (error || !data?.email) throw new Error(data?.error || 'Kunde inte skapa demo');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (signInError) throw signInError;
      toast.success(`Inloggad som ${data.companyName} — omdirigerar...`);
      setTimeout(() => navigate('/admin'), 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Demo-inloggning misslyckades');
      setDemoLoading(false);
    }
  };

  usePageMeta({
    title: 'Logga in | Aurora Transport',
    description: 'Logga in på Aurora Transport för att hantera uppdrag, förare och fakturor.',
    canonical: 'https://auroratransport.se/login',
    noindex: true,
  });

  useEffect(() => {
    if (!loading && session && role) {
      if (isPlatformAdmin) navigate('/platform', { replace: true });
      else if (role === 'admin') navigate('/admin', { replace: true });
      else navigate('/driver', { replace: true });
    }
  }, [loading, session, role, isPlatformAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message?.includes('Invalid login credentials') ? 'Fel e-post eller lösenord. Försök igen.' : error.message || 'Inloggningen misslyckades.';
      toast.error(msg);
      setSubmitting(false);
      return;
    }
    toast.success('Välkommen!');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0a1a] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.25),transparent_40rem)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Till startsidan</Link>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4f46e5] shadow-xl shadow-[#4f46e5]/30"><Truck className="h-8 w-8 text-white" /></div>
            <h1 className="text-3xl font-black tracking-tight text-white">Aurora Transport</h1>
            <p className="mt-2 text-sm text-slate-400">Logga in på ditt konto</p>
          </div>

          <div className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-slate-200">E-post</Label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="email" type="email" placeholder="namn@foretag.se" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 border-[#1e1e5a] bg-[#0f0f2a] pl-10 text-white placeholder:text-slate-600 focus-visible:ring-[#4f46e5]" /></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label htmlFor="password" className="text-sm font-bold text-slate-200">Lösenord</Label><Link to="/forgot-password" className="text-xs font-semibold text-[#818cf8] hover:text-white">Glömt lösenord?</Link></div>
                <div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 border-[#1e1e5a] bg-[#0f0f2a] pl-10 text-white placeholder:text-slate-600 focus-visible:ring-[#4f46e5]" /></div>
              </div>
              <Button type="submit" disabled={submitting} className="h-12 w-full rounded-2xl bg-[#4f46e5] text-sm font-black text-white shadow-lg shadow-[#4f46e5]/25 hover:bg-[#4338ca]">{submitting ? 'Loggar in...' : 'Logga in'}</Button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={demoLoading} className="gap-1.5 rounded-xl border-[#1e1e5a] bg-[#141432] text-slate-200 hover:bg-[#1e1e5a]/60 hover:text-white"><Play className="h-3.5 w-3.5" />{demoLoading ? 'Laddar...' : 'Testa demo'}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56"><DropdownMenuItem onClick={() => handleDemo('akeri')} className="cursor-pointer"><div><p className="font-medium">Demo Åkeri AB</p><p className="text-xs text-muted-foreground">Transport & logistik</p></div></DropdownMenuItem><DropdownMenuItem onClick={() => handleDemo('bemanning')} className="cursor-pointer"><div><p className="font-medium">Demo Bemanning AB</p><p className="text-xs text-muted-foreground">Bemanning & personal</p></div></DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">Inget konto? <Link to="/register" className="font-bold text-[#818cf8] hover:text-white">Skapa konto</Link> eller <Link to="/kontakt" className="font-bold text-[#818cf8] hover:text-white">kontakta oss</Link></p>
          <p className="mt-3 text-center text-xs text-slate-600">© {new Date().getFullYear()} Aurora Transport</p>
        </div>
      </div>
    </div>
  );
}
