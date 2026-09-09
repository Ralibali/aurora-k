import { useState, useEffect, useRef, useCallback } from 'react';
import { usePageMeta } from '@/lib/use-page-meta';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Building2, User, Mail, Lock, Eye, EyeOff, AlertCircle, Phone, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { requestAuthEmail } from '@/lib/auth-email';
import { trackEventOnce } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { completeCompanyRegistration, getRegistrationDraft, type RegistrationDraft } from '@/features/onboarding/registration-service';
import type { Session } from '@supabase/supabase-js';

function getPasswordStrength(pw: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (pw.length >= 10) score++;
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
  const { session, companyId, role, loading: authLoading, refreshProfile } = useAuth();

  usePageMeta({
    title: 'Starta gratis provperiod – 14 dagar utan kostnad | Aurora Transport',
    description: 'Skapa konto och testa Aurora Transport gratis i 14 dagar. Inget betalkort krävs. 449 kr/mån efteråt, ingen bindningstid.',
    canonical: 'https://auroratransport.se/register',
    noindex: true,
  });

  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const bootstrapBusy = useRef(false);
  const attemptedUser = useRef('');

  const finishRegistration = useCallback(async (current: Session, draft?: RegistrationDraft) => {
    if (bootstrapBusy.current) return;
    bootstrapBusy.current = true;
    setSubmitting(true);
    setRegistrationError('');
    try {
      const registeredCompanyId = await completeCompanyRegistration(current, draft);
      const profile = await refreshProfile();
      if (profile.companyId !== registeredCompanyId || profile.role !== 'admin') throw new Error('Företagskopplingen kunde inte bekräftas. Försök igen.');
      trackEventOnce(registeredCompanyId, 'Trial Started', { plan: 'aurora_449', billing_interval: 'monthly' });
      toast.success('Kontot är klart — din provperiod är igång.');
      navigate('/onboarding', { replace: true });
    } catch (cause) {
      setRegistrationError(cause instanceof Error ? cause.message : 'Registreringen kunde inte slutföras. Försök igen.');
    } finally { bootstrapBusy.current = false; setSubmitting(false); }
  }, [navigate, refreshProfile]);

  useEffect(() => {
    if (!session || authLoading || bootstrapBusy.current) return;
    if (companyId) { navigate(role === 'driver' ? '/driver' : '/admin', { replace: true }); return; }
    const draft = getRegistrationDraft(session.user.user_metadata);
    if (!draft || attemptedUser.current === session.user.id) return;
    attemptedUser.current = session.user.id;
    setCompanyName(draft.companyName); setOrgNumber(draft.orgNr); setFullName(draft.fullName); setPhone(draft.phone);
    void finishRegistration(session, draft);
  }, [session, authLoading, companyId, role, navigate, finishRegistration]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = 'Företagsnamn krävs';
    if (!orgNumber.trim()) e.orgNumber = 'Organisationsnummer krävs';
    else if (!/^\d{6}-?\d{4}$/.test(orgNumber.trim())) e.orgNumber = 'Format: XXXXXX-XXXX';
    if (!fullName.trim()) e.fullName = 'Ditt namn krävs';
    if (!phone.trim()) e.phone = 'Telefonnummer krävs';
    if (!session && !email.trim()) e.email = 'E-postadress krävs';
    else if (!session && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Ogiltig e-postadress';
    if (!session && !password) e.password = 'Lösenord krävs';
    else if (!session && password.length < 10) e.password = 'Lösenordet måste vara minst 10 tecken';
    if (!session && new TextEncoder().encode(password).length > 72) e.password = 'Lösenordet får innehålla högst 72 byte';
    if (!session && password !== confirmPassword) e.confirmPassword = 'Lösenorden matchar inte';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const draft = { companyName: companyName.trim(), orgNr: orgNumber.trim(), fullName: fullName.trim(), phone: phone.trim() };
    if (session) { await finishRegistration(session, draft); return; }
    setSubmitting(true);

    try {
      await requestAuthEmail({ type: 'signup', email, password, registration: draft });
      setConfirmationEmail(email.trim().toLowerCase());
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = getPasswordStrength(password);

  const resendConfirmation = async () => {
    setSubmitting(true);
    try {
      await requestAuthEmail({ type: 'resend', email: confirmationEmail });
      toast.success('Om registreringen väntar på bekräftelse skickas ett nytt mejl.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mejlet kunde inte begäras.');
    } finally { setSubmitting(false); }
  };

  if (confirmationEmail && !session) return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8"><Mail className="h-9 w-9 text-primary" /><h1 className="text-xl font-semibold">Bekräfta din e-post</h1><p className="text-sm text-muted-foreground">Om adressen kan registreras skickas en bekräftelselänk till <strong>{confirmationEmail}</strong>. Öppna länken för att slutföra registreringen. Provperioden börjar när företaget har skapats.</p><p className="text-sm text-muted-foreground">Har du redan ett konto? Logga in eller återställ ditt lösenord.</p><Button className="w-full" disabled={submitting} onClick={() => void resendConfirmation()}>Skicka mejlet igen</Button><Button asChild variant="outline" className="w-full"><Link to="/login">Jag har bekräftat — logga in</Link></Button><Link className="block text-center text-sm text-primary underline" to="/forgot-password">Återställ lösenord</Link></div></div>;

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
          <h2 className="mb-1 text-lg font-bold text-white">Starta din gratis provperiod</h2>
          <p className="mb-6 text-sm text-slate-400">14 dagar gratis — inget betalkort krävs. Kontot pausas automatiskt efter provperioden om du väljer att inte fortsätta.</p>

          {registrationError && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{registrationError}</div>}
          {session && <p className="mb-4 text-sm text-slate-300">Slutför företagsregistreringen för {session.user.email}.</p>}
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
              <Label htmlFor="orgNumber" className="text-sm font-bold text-slate-200">Organisationsnummer *</Label>
              <Input id="orgNumber" placeholder="556XXX-XXXX" value={orgNumber} onChange={e => setOrgNumber(e.target.value)} className={inputCls} />
              {errors.orgNumber && <p className="text-xs text-red-400">{errors.orgNumber}</p>}
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

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-bold text-slate-200">Telefonnummer *</Label>
              <div className="relative">
                <Phone className={iconCls} />
                <Input id="phone" type="tel" placeholder="070-123 45 67" value={phone} onChange={e => setPhone(e.target.value)} className={`pl-10 ${inputCls}`} />
              </div>
              {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
            </div>

            {!session && <>
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
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Minst 10 tecken" value={password} onChange={e => setPassword(e.target.value)} className={`pl-10 pr-10 ${inputCls}`} />
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
            </>}

            <Button type="submit" className="mt-2 h-12 w-full rounded-2xl bg-[#4f46e5] text-sm font-black text-white shadow-lg shadow-[#4f46e5]/25 hover:bg-[#4338ca]" disabled={submitting}>
              {submitting ? 'Skapar konto...' : 'Starta gratis provperiod'}
            </Button>

            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Full tillgång till allt i 14 dagar. Inget kort, ingen bindningstid — du betalar först om du väljer att fortsätta efteråt (449 kr/mån).
                {' '}<a href="/#pris" className="font-semibold underline underline-offset-2">Se hela prislistan, inklusive uppstart och onboarding.</a>
              </p>
            </div>
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
