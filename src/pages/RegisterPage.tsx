import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Building2, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

function getPasswordStrength(pw: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Svagt', pct: 20, color: 'bg-red-500' };
  if (score <= 2) return { label: 'Okej', pct: 40, color: 'bg-orange-500' };
  if (score <= 3) return { label: 'Bra', pct: 60, color: 'bg-yellow-500' };
  if (score <= 4) return { label: 'Starkt', pct: 80, color: 'bg-emerald-500' };
  return { label: 'Mycket starkt', pct: 100, color: 'bg-emerald-600' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get('cancelled');

  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = 'Företagsnamn krävs';
    if (!fullName.trim()) e.fullName = 'Ditt namn krävs';
    if (!email.trim()) e.email = 'E-postadress krävs';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Ogiltig e-postadress';
    if (!password) e.password = 'Lösenord krävs';
    else if (password.length < 8) e.password = 'Lösenordet måste vara minst 8 tecken';
    if (password !== confirmPassword) e.confirmPassword = 'Lösenorden matchar inte';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'admin' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Kunde inte skapa konto');

      const userId = authData.user.id;

      // 2. Create company + update profile + assign role (atomic, bypasses RLS)
      const { data: companyResult, error: companyError } = await supabase
        .rpc('register_company', {
          _name: companyName,
          _org_nr: orgNumber || null,
          _user_full_name: fullName,
        });
      if (companyError) throw companyError;

      const companyId = companyResult as string;

      // Save onboarding state
      localStorage.setItem('onboarding_company_id', company.id);
      localStorage.setItem('onboarding_company_name', companyName);
      localStorage.setItem('onboarding_org_nr', orgNumber);

      // 5. Create Stripe Checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: { companyId: company.id, companyName },
      });

      if (checkoutError || !checkoutData?.url) {
        // If Stripe fails, still allow onboarding (manual activation later)
        console.error('Stripe checkout error:', checkoutError);
        toast.success('Konto skapat! Betalning kan slutföras senare.');
        navigate('/onboarding');
        return;
      }

      // 6. Redirect to Stripe Checkout
      window.location.href = checkoutData.url;
    } catch (err: any) {
      toast.error(err.message || 'Något gick fel');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-3">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Aurora Transport</h1>
        </div>

        {cancelled && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Betalningen avbröts. Du kan försöka igen.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <h2 className="text-lg font-semibold text-foreground mb-1">Skapa konto</h2>
          <p className="text-sm text-muted-foreground mb-6">Kom igång med ditt transportföretag</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm font-medium">Företagsnamn *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input id="companyName" placeholder="AB Transport" value={companyName} onChange={e => setCompanyName(e.target.value)} className="pl-10 h-11" />
              </div>
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
            </div>

            {/* Org Number */}
            <div className="space-y-1.5">
              <Label htmlFor="orgNumber" className="text-sm font-medium">Organisationsnummer</Label>
              <Input id="orgNumber" placeholder="556xxx-xxxx" value={orgNumber} onChange={e => setOrgNumber(e.target.value)} className="h-11" />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium">Ditt namn *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input id="fullName" placeholder="Anna Andersson" value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10 h-11" />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-postadress *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input id="email" type="email" placeholder="anna@foretag.se" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-11" />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Lösenord *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Minst 8 tecken" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} rounded-full transition-all`} style={{ width: `${strength.pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Bekräfta lösenord *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input id="confirmPassword" type="password" placeholder="Upprepa lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 h-11" />
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-semibold rounded-xl mt-2" disabled={submitting}>
              {submitting ? 'Skapar konto...' : 'Skapa konto'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Har du redan ett konto?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
