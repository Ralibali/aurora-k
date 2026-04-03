import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, Trash2, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'onboarding_step';

interface InviteRow {
  name: string;
  email: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, companyId } = useAuth();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('onboarding_company_name') || '');
  const [orgNr, setOrgNr] = useState(() => localStorage.getItem('onboarding_org_nr') || '');

  // Step 2
  const [invites, setInvites] = useState<InviteRow[]>([{ name: '', email: '' }]);

  // Step 3
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [availableDrivers, setAvailableDrivers] = useState<{ id: string; full_name: string }[]>([]);

  const resolvedCompanyId = companyId || localStorage.getItem('onboarding_company_id');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  // Load drivers for step 3
  useEffect(() => {
    if (step === 3 && resolvedCompanyId) {
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'driver')
        .eq('company_id', resolvedCompanyId)
        .then(({ data }) => {
          if (data) setAvailableDrivers(data);
        });
    }
  }, [step, resolvedCompanyId]);

  const goNext = () => setStep(s => Math.min(s + 1, 3));

  const handleStep1 = async () => {
    if (!resolvedCompanyId) return;
    setSubmitting(true);
    try {
      await supabase.from('companies').update({ name: companyName, org_nr: orgNr || null }).eq('id', resolvedCompanyId);
      localStorage.setItem('onboarding_company_name', companyName);
      localStorage.setItem('onboarding_org_nr', orgNr);
      goNext();
    } catch {
      toast.error('Kunde inte spara');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Send = async () => {
    const valid = invites.filter(i => i.email.trim());
    if (valid.length === 0) { goNext(); return; }

    setSubmitting(true);
    try {
      for (const inv of valid) {
        await supabase.from('invitations').insert({
          company_id: resolvedCompanyId!,
          email: inv.email.trim(),
          name: inv.name.trim() || null,
        });
      }
      toast.success(`${valid.length} inbjudan(ar) skickade!`);
      goNext();
    } catch {
      toast.error('Kunde inte skicka inbjudningar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep3 = async () => {
    setSubmitting(true);
    try {
      if (assignmentTitle && assignmentDate && resolvedCompanyId) {
        // Create a basic customer or use first available
        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', resolvedCompanyId)
          .limit(1);

        let customerId = customers?.[0]?.id;
        if (!customerId) {
          const { data: newCust } = await supabase
            .from('customers')
            .insert({ name: 'Standardkund', company_id: resolvedCompanyId })
            .select('id')
            .single();
          customerId = newCust?.id;
        }

        if (customerId) {
          await supabase.from('assignments').insert({
            title: assignmentTitle,
            scheduled_start: new Date(assignmentDate).toISOString(),
            address: [fromAddress, toAddress].filter(Boolean).join(' → ') || 'Ej angiven',
            assigned_driver_id: selectedDriver || user?.id || '',
            customer_id: customerId,
            company_id: resolvedCompanyId,
          });
        }
      }
      await completeOnboarding();
    } catch {
      toast.error('Kunde inte skapa uppdraget');
    } finally {
      setSubmitting(false);
    }
  };

  const completeOnboarding = async () => {
    if (resolvedCompanyId) {
      await supabase.from('companies').update({ onboarding_completed: true }).eq('id', resolvedCompanyId);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('onboarding_company_id');
    localStorage.removeItem('onboarding_company_name');
    localStorage.removeItem('onboarding_org_nr');
    toast.success('Välkommen! Ditt konto är redo.', { duration: 5000 });
    navigate('/admin', { replace: true });
  };

  const addInviteRow = () => setInvites(prev => [...prev, { name: '', email: '' }]);
  const removeInviteRow = (i: number) => setInvites(prev => prev.filter((_, idx) => idx !== i));
  const updateInvite = (i: number, field: keyof InviteRow, val: string) => {
    setInvites(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex gap-2 mb-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">Steg {step} av 3</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-8 mt-4">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold mb-1">Välkommen till Aurora Transport!</h2>
              <p className="text-sm text-muted-foreground mb-6">Bekräfta dina företagsuppgifter för att komma igång.</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Företagsnamn</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Organisationsnummer</Label>
                  <Input value={orgNr} onChange={e => setOrgNr(e.target.value)} placeholder="556xxx-xxxx" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Din e-post</Label>
                  <Input value={user?.email || ''} readOnly className="h-11 bg-slate-50 text-muted-foreground" />
                </div>

                <Button onClick={handleStep1} className="w-full h-12 rounded-xl font-semibold" disabled={submitting || !companyName.trim()}>
                  Ser bra ut, fortsätt <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold mb-1">Bjud in dina förare</h2>
              <p className="text-sm text-muted-foreground mb-6">Skicka inbjudningar via e-post så kan de registrera sig direkt.</p>

              <div className="space-y-3">
                {invites.map((inv, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input placeholder="Namn" value={inv.name} onChange={e => updateInvite(i, 'name', e.target.value)} className="h-10" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input type="email" placeholder="E-post" value={inv.email} onChange={e => updateInvite(i, 'email', e.target.value)} className="h-10" />
                    </div>
                    {invites.length > 1 && (
                      <button onClick={() => removeInviteRow(i)} className="mt-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addInviteRow} className="mt-3 text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Lägg till fler
              </button>

              <div className="mt-6 space-y-2">
                <Button onClick={handleStep2Send} className="w-full h-12 rounded-xl font-semibold" disabled={submitting}>
                  {submitting ? 'Skickar...' : 'Skicka inbjudningar'}
                </Button>
                <button onClick={goNext} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2">
                  Hoppa över →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold mb-1">Skapa ditt första uppdrag</h2>
              <p className="text-sm text-muted-foreground mb-6">Testa att skapa ett uppdrag – du kan alltid ändra det efteråt.</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Uppdragsnamn</Label>
                  <Input placeholder="T.ex. Leverans till Kund AB" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Datum och tid</Label>
                  <Input type="datetime-local" value={assignmentDate} onChange={e => setAssignmentDate(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Från-adress</Label>
                  <Input placeholder="Startadress" value={fromAddress} onChange={e => setFromAddress(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Till-adress</Label>
                  <Input placeholder="Leveransadress" value={toAddress} onChange={e => setToAddress(e.target.value)} className="h-11" />
                </div>
                {availableDrivers.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Välj förare</Label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Välj en förare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDrivers.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button onClick={handleStep3} className="w-full h-12 rounded-xl font-semibold" disabled={submitting}>
                  {submitting ? 'Skapar...' : (
                    <>Skapa och gå till dashboarden <Check className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
                <button onClick={completeOnboarding} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2">
                  Hoppa över →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
