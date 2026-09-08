import { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { trackEventOnce } from '@/lib/analytics';
import { CompanyStep } from '@/features/onboarding/CompanyStep';
import { InviteStep } from '@/features/onboarding/InviteStep';
import { FirstAssignmentStep, type FirstAssignmentDraft } from '@/features/onboarding/FirstAssignmentStep';
import { Button } from '@/components/ui/button';
import {
  createOnboardingAssignment,
  finishOnboarding,
  saveOnboardingCompany,
  sendOnboardingInvites,
  type DriverInvite,
} from '@/features/onboarding/onboarding-service';

const emptyAssignment: FirstAssignmentDraft = {
  customerName: '',
  title: '',
  scheduledStart: '',
  pickupAddress: '',
  deliveryAddress: '',
  driverId: '',
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user, companyId, loading: authLoading, role, error: authError } = useAuth();
  const resolvedCompanyId = companyId;
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [loadedCompanyId, setLoadedCompanyId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [invites, setInvites] = useState<DriverInvite[]>([{ name: '', email: '' }]);
  const [drivers, setDrivers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [assignment, setAssignment] = useState<FirstAssignmentDraft>(emptyAssignment);
  const [assignmentCreated, setAssignmentCreated] = useState(false);

  const checkoutReturn = searchParams.get('checkout') === 'success';
  const loadCompany = useCallback(async () => {
    if (!companyId || authLoading) return;
    setLoadError('');
    const { data, error } = await supabase.from('companies').select('name, org_nr, onboarding_completed, subscription_status').eq('id', companyId).single();
    if (error || !data) { setLoadError('Företagsuppgifterna kunde inte hämtas. Försök igen.'); return; }
    if (checkoutReturn && data.subscription_status !== 'active') { setWaitingForPayment(true); return; }
    setWaitingForPayment(false);
    if (data.onboarding_completed) { navigate('/admin', { replace: true }); return; }
    setCompanyName(data.name); setOrgNumber(data.org_nr || '');
    const savedStep = Number(sessionStorage.getItem(`onboarding:${companyId}:step`) || 1);
    setStep([1, 2, 3].includes(savedStep) ? savedStep : 1);
    setLoadedCompanyId(companyId);
  }, [companyId, authLoading, checkoutReturn, navigate]);
  useEffect(() => { void loadCompany(); }, [loadCompany]);
  useEffect(() => {
    if (!waitingForPayment) return;
    let attempts = 0;
    const timer = window.setInterval(() => { if (++attempts >= 10) window.clearInterval(timer); void loadCompany(); }, 3000);
    return () => window.clearInterval(timer);
  }, [waitingForPayment, loadCompany]);
  useEffect(() => { if (loadedCompanyId) sessionStorage.setItem(`onboarding:${loadedCompanyId}:step`, String(step)); }, [step, loadedCompanyId]);

  // Fire signup + trial events exactly once per company when the user returns
  // from a successful Stripe Checkout session. We only rely on the presence of
  // the `?checkout=success` query param that the create-checkout function sets.
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return;
    if (!resolvedCompanyId) return;
    trackEventOnce(resolvedCompanyId, 'Signup Completed', { source: 'onboarding', role: 'admin' });
  }, [searchParams, resolvedCompanyId]);

  const refreshDrivers = useCallback(() => {
    if (!resolvedCompanyId) return;
    void supabase.from('profiles').select('id, full_name').eq('company_id', resolvedCompanyId).eq('role', 'driver').order('full_name')
      .then(({ data, error }) => {
        if (error) toast.error('Kunde inte ladda chaufförer');
        setDrivers((data ?? []).filter(driver => Boolean(driver.full_name)) as Array<{ id: string; full_name: string }>);
      });
  }, [resolvedCompanyId]);
  useEffect(() => { if (step === 3) refreshDrivers(); }, [step, refreshDrivers]);

  const progress = useMemo(() => [1, 2, 3], []);

  const complete = async () => {
    if (!resolvedCompanyId) return;
    await finishOnboarding(resolvedCompanyId);
    sessionStorage.removeItem(`onboarding:${resolvedCompanyId}:step`);
    toast.success('Kontot är klart att använda');
    navigate('/admin', { replace: true });
  };

  const saveCompany = async () => {
    if (!resolvedCompanyId) return toast.error('Företaget är inte kopplat till kontot ännu');
    setSubmitting(true);
    try {
      await saveOnboardingCompany(resolvedCompanyId, companyName, orgNumber);
      setStep(2);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Företagsuppgifterna kunde inte sparas');
    } finally { setSubmitting(false); }
  };

  const sendInvites = async () => {
    if (!resolvedCompanyId) return toast.error('Företaget saknas');
    const valid = invites.filter(invite => invite.email.trim());
    if (!valid.length) return setStep(3);
    setSubmitting(true);
    try {
      const result = await sendOnboardingInvites({
        companyId: resolvedCompanyId,
        companyName: companyName.trim() || 'Ditt företag',
        adminName: user?.user_metadata?.full_name || 'Administratören',
        invites: valid,
      });
      if (result.sent.length) toast.success(`${result.sent.length} inbjudan${result.sent.length === 1 ? '' : 'ar'} skickades`);
      if (result.failed.length) {
        setInvites(result.failed.map(({ name, email }) => ({ name, email })));
        toast.error(`${result.failed.length} inbjudan${result.failed.length === 1 ? '' : 'ar'} misslyckades och ligger kvar för nytt försök`);
        return;
      }
      setStep(3);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Inbjudningarna kunde inte skickas');
    } finally { setSubmitting(false); }
  };

  const createAssignment = async () => {
    if (!resolvedCompanyId) return toast.error('Företaget saknas');
    setSubmitting(true);
    try {
      if (!assignmentCreated) {
        await createOnboardingAssignment({ companyId: resolvedCompanyId, ...assignment });
        setAssignmentCreated(true);
      }
      await complete();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Uppdraget kunde inte skapas');
    } finally { setSubmitting(false); }
  };

  const finishWithoutAssignment = async () => {
    if (!resolvedCompanyId) return toast.error('Företaget saknas');
    setSubmitting(true);
    try { await complete(); }
    catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Onboardingen kunde inte slutföras'); }
    finally { setSubmitting(false); }
  };

  if (authLoading) return <div className="p-12 text-center" role="status">Hämtar kontot…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (authError) return <Navigate to="/admin" replace />;
  if (!resolvedCompanyId) return <Navigate to="/register" replace />;
  if (role !== 'admin') return <Navigate to="/driver" replace />;
  if (waitingForPayment || loadError) return <div className="flex min-h-screen items-center justify-center p-6"><div className="max-w-md space-y-4 rounded-xl border bg-card p-6"><h1 className="font-semibold">{waitingForPayment ? 'Vi bekräftar betalningen' : 'Företaget kunde inte hämtas'}</h1><p className="text-sm text-muted-foreground">{loadError || 'Bekräftelsen kan ta en stund. Du behöver inte betala igen.'}</p><Button onClick={() => void loadCompany()}>Kontrollera igen</Button></div></div>;
  if (loadedCompanyId !== resolvedCompanyId) return <div className="p-12 text-center" role="status">Hämtar företagsuppgifterna…</div>;

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 p-4 pt-12">
      <div className="w-full max-w-xl">
        <div className="mb-5 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary"><Truck className="h-6 w-6 text-primary-foreground" /></div></div>
        <div className="mb-4 flex gap-2">{progress.map(value => <div key={value} className={`h-1.5 flex-1 rounded-full ${value <= step ? 'bg-primary' : 'bg-slate-200'}`} />)}</div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && <CompanyStep name={companyName} orgNumber={orgNumber} email={user?.email || ''} submitting={submitting} onNameChange={setCompanyName} onOrgNumberChange={setOrgNumber} onSubmit={saveCompany} />}
          {step === 2 && <InviteStep invites={invites} submitting={submitting} onChange={(index, field, value) => setInvites(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))} onAdd={() => setInvites(rows => [...rows, { name: '', email: '' }])} onRemove={index => setInvites(rows => rows.filter((_, rowIndex) => rowIndex !== index))} onSubmit={sendInvites} onSkip={() => setStep(3)} />}
          {step === 3 && <FirstAssignmentStep draft={assignment} drivers={drivers} submitting={submitting} onRefreshDrivers={refreshDrivers} onChange={(field, value) => setAssignment(current => ({ ...current, [field]: value }))} onSubmit={createAssignment} onSkip={finishWithoutAssignment} />}
        </div>
      </div>
    </div>
  );
}
