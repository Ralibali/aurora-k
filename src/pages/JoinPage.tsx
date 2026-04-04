import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  company_id: string;
  company_name?: string;
}

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setError('Ingen inbjudningslänk hittades.');
      setLoading(false);
      return;
    }

    (async () => {
      // Look up invitation securely via RPC
      const { data, error: fetchError } = await supabase
        .rpc('lookup_invitation_by_token', { p_token: token });

      if (fetchError || !data) {
        setError('Inbjudan har redan använts eller är ogiltig.');
        setLoading(false);
        return;
      }

      const inv = data as { id: string; email: string; name: string | null; company_id: string };

      // Get company name (will work after sign-up, but try anyway)
      let companyName = 'Okänt företag';
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', inv.company_id)
          .single();
        if (company?.name) companyName = company.name;
      } catch {}

      setInvitation({
        ...inv,
        company_name: companyName,
      });
      setName(inv.name || '');
      setLoading(false);
    })();
  }, [token]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Namn krävs';
    if (!password) e.password = 'Lösenord krävs';
    else if (password.length < 8) e.password = 'Minst 8 tecken';
    if (password !== confirmPassword) e.confirmPassword = 'Lösenorden matchar inte';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !invitation) return;
    setSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('join-driver', {
        body: { token, name, password },
      });

      if (fnError) throw new Error(fnError.message || 'Något gick fel');
      if (data?.error) throw new Error(data.error);

      // Set session from the response
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      toast.success('Välkommen! Ditt konto är skapat.');
      navigate('/driver', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Något gick fel');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-8 max-w-md text-center">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Inbjudan ogiltig</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-3">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold">Du har blivit inbjuden!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gå med i <span className="font-medium text-foreground">{invitation?.company_name}</span> som förare
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ditt namn</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-11" />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">E-post</Label>
              <Input value={invitation?.email || ''} readOnly className="h-11 bg-slate-50 text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Lösenord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input type={showPassword ? 'text' : 'password'} placeholder="Minst 8 tecken" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Bekräfta lösenord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input type="password" placeholder="Upprepa lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 h-11" />
              </div>
              {formErrors.confirmPassword && <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={submitting}>
              {submitting ? 'Skapar konto...' : 'Skapa konto och logga in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
