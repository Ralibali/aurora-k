import { useState, useEffect } from 'react';
import { usePageMeta } from '@/lib/use-page-meta';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Building2, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

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

  usePageMeta({
    title: 'Registrera företag – Kom igång gratis | Aurora Transport',
    description: 'Skapa konto och kom igång med Aurora Transport på under 5 minuter. 449 kr/mån, ingen bindningstid.',
    canonical: 'https://auroratransport.se/register',
    noindex: true,
  });

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

      // 2. Create company via edge function (bypasses RLS since no session yet)
      const { data: companyResult, error: companyError } = await supabase.functions.invoke('register-company', {
        body: { userId, companyName, orgNr: orgNumber || null, fullName },
      });
      if (companyError) throw companyError;
      if (!companyResult?.companyId) throw new Error('Kunde inte skapa företag');

      const companyId = companyResult.companyId;

      // Save onboarding state
      localStorage.setItem('onboarding_company_id', companyId);
      localStorage.setItem('onboarding_company_name', companyName);
      localStorage.setItem('onboarding_org_nr', orgNumber);

      // 3. Create Stripe Checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: { companyId, companyName },
      });

      if (checkoutError || !checkoutData?.url) {
        // If Stripe fails, still allow onboarding (manual activation later)
        console.error('Stripe checkout error:', checkoutError);
        toast.success('Konto skapat! Betalning kan slutföras senare.');
        navigate('/onboarding');
        return;
      }

      // Track that a real checkout session was created before redirecting.
      trackEvent('Subscription Checkout Started', {
        plan: 'aurora_449',
        billing_interval: 'monthly',
        source: 'register',
      });

      // 6. Redirect to Stripe Checkout
      window.location.href = checkoutData.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = getPasswordStrength(password);

  const inputCls = "h-11 border-[#1e1e5a] bg-[#0f0f2a] text-white placeholder:text-slate-600 focus-visible:ring-[#4f46e5]";
  const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a1a] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.25),transparent_40rem)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center">
       <div className="w-full">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4f46e5] shadow-xl shadow-[#4f46e5]/30">
            <Truck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-white">Aurora Transport</h1>
        </div>

        {cancelled && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Betalningen avbröts. Du kan försöka igen.</p>
          </div>
        )}

        <div className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432]/90 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur">
          <h2 className="mb-1 text-lg font-bold text-white">Skapa konto</h2>
          <p className="mb-6 text-sm text-slate-400">Kom igång med ditt transportföretag</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm font-bold text-slate-200">Företagsnamn *</Label>
              <div className="relative">
                <Building2 className={iconCls} />
                <Input id="companyName" placeholder="AB Transport" value={companyName} onChange={e => setCompanyName(e.target.value)} className={`pl-10 ${inputCls}`} />
              </div>
              {errors.companyName && <p className="text-xs text-red-400">{errors.companyName}</p>}
            </div>

            {/* Org Number */}
            <div className="space-y-1.5">
              <Label htmlFor="orgNumber" className="text-sm font-bold text-slate-200">Organisationsnummer</Label>
              <Input id="orgNumber" placeholder="556xxx-xxxx" value={orgNumber} onChange={e => setOrgNumber(e.target.value)} className={inputCls} />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-bold text-slate-200">Ditt namn *</Label>
              <div className="relative">
                <User className={iconCls} />
                <Input id="fullName" placeholder="Anna Andersson" value={fullName} onChange={e => setFullName(e.target.value)} className={`pl-10 ${inputCls}`} />
              </div>
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-bold text-slate-200">E-postadress *</Label>
              <div className="relative">
                <Mail className={iconCls} />
                <Input id="email" type="email" placeholder="anna@foretag.se" value={email} onChange={e => setEmail(e.target.value)} className={`pl-10 ${inputCls}`} />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-bold text-slate-200">Lösenord *</Label>
              <div className="relative">
                <Lock className={iconCls} />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Minst 8 tecken" value={password} onChange={e => setPassword(e.target.value)} className={`pl-10 pr-10 ${inputCls}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#0f0f2a] rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} rounded-full transition-all`} style={{ width: `${strength.pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{strength.label}</span>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-200">Bekräfta lösenord *</Label>
              <div className="relative">
                <Lock className={iconCls} />
                <Input id="confirmPassword" type="password" placeholder="Upprepa lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`pl-10 ${inputCls}`} />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="mt-2 h-12 w-full rounded-2xl bg-[#4f46e5] text-sm font-black text-white shadow-lg shadow-[#4f46e5]/25 hover:bg-[#4338ca]" disabled={submitting}>
              {submitting ? 'Skapar konto...' : 'Skapa konto'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Har du redan ett konto?{' '}
          <Link to="/login" className="font-bold text-[#818cf8] hover:text-white">Logga in</Link>
        </p>
       </div>
      </div>
    </div>
  );
}
