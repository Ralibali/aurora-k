import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { Search, Building2, Users, ChevronDown, ChevronUp, ExternalLink, KeyRound, Power, PowerOff, Mail, Gift, Plus, Copy, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type FilterStatus = 'all' | 'active' | 'pending' | 'cancelled';

export default function PlatformCompanies() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState<{ userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ companyName: '', orgNr: '', adminName: '', adminEmail: '' });
  const [createResult, setCreateResult] = useState<{ checkout_url: string | null; temp_password: string } | null>(null);
  const [creatingCompany, setCreatingCompany] = useState(false);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['platform-companies-detail'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['platform-profiles-all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, company_id, role, full_name, email');
      return data || [];
    },
  });

  const getCompanyProfiles = (companyId: string) =>
    profiles?.filter((p: any) => p.company_id === companyId) || [];

  const getUserCount = (companyId: string) => getCompanyProfiles(companyId).length;
  const getAdminCount = (companyId: string) =>
    getCompanyProfiles(companyId).filter((p: any) => p.role === 'admin').length;

  const trialDaysLeft = (c: any) => {
    if (!c.trial_ends_at) return null;
    const diff = Math.ceil((new Date(c.trial_ends_at).getTime() - Date.now()) / 86400000);
    return diff > 0 ? diff : null;
  };

  const statusLabel = (c: any) => {
    const trial = trialDaysLeft(c);
    if (trial !== null) return { label: `Trial — ${trial} dagar kvar`, variant: 'outline' as const, className: 'text-blue-600 border-blue-200' };
    switch (c.subscription_status) {
      case 'active': return { label: 'Aktiv', variant: 'default' as const, className: '' };
      case 'past_due': return { label: 'Förfallen', variant: 'destructive' as const, className: '' };
      case 'cancelled': return { label: 'Avslutad', variant: 'secondary' as const, className: '' };
      default: return { label: 'Pending', variant: 'outline' as const, className: '' };
    }
  };

  const filtered = (companies || []).filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.org_nr || '').includes(search);
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    return c.subscription_status === filter;
  });

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, trialDays }: { id: string; status: string; trialDays?: number }) => {
      const update: any = { subscription_status: status };
      if (trialDays) {
        update.trial_ends_at = new Date(Date.now() + trialDays * 86400000).toISOString();
      }
      const { error } = await supabase.from('companies').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-companies-detail'] });
      toast.success('Status uppdaterad');
    },
    onError: () => toast.error('Kunde inte uppdatera status'),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { user_id: userId, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      setResetDialog(null);
      setNewPassword('');
      toast.success('Lösenord återställt');
    },
    onError: (e: any) => toast.error(e.message || 'Kunde inte återställa lösenord'),
  });

  const sendWelcome = useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      const admins = getCompanyProfiles(companyId).filter((p: any) => p.role === 'admin');
      const admin = admins[0];
      if (!admin) throw new Error('Ingen admin hittad');
      const company = companies?.find((c: any) => c.id === companyId);
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: admin.email,
          templateName: 'driver-welcome',
          templateData: { firstName: admin.full_name, companyName: company?.name || '' },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Välkomstmail skickat'),
    onError: () => toast.error('Kunde inte skicka mail'),
  });

  const handleCreateCompany = async () => {
    const { companyName, adminName, adminEmail, orgNr } = createForm;
    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      toast.error('Fyll i företagsnamn, kontaktperson och e-post');
      return;
    }
    setCreatingCompany(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-onboarding-link', {
        body: { company_name: companyName.trim(), org_nr: orgNr.trim() || null, admin_name: adminName.trim(), admin_email: adminEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCreateResult({ checkout_url: data.checkout_url, temp_password: data.temp_password });
      queryClient.invalidateQueries({ queryKey: ['platform-companies-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-profiles-all'] });
      toast.success(`${companyName} skapades!`);
    } catch (err: any) {
      toast.error('Kunde inte skapa: ' + err.message);
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setCreateForm({ companyName: '', orgNr: '', adminName: '', adminEmail: '' });
    setCreateResult(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopierad!`);
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'Alla', value: 'all' },
    { label: 'Aktiva', value: 'active' },
    { label: 'Väntande', value: 'pending' },
    { label: 'Avslutade', value: 'cancelled' },
  ];

  return (
    <PlatformLayout title="Företagshantering" description="Alla registrerade företag">
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök företag eller orgnr..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Skapa företag
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((c: any) => {
          const status = statusLabel(c);
          const isExpanded = expanded === c.id;
          const companyProfiles = getCompanyProfiles(c.id);

          return (
            <Card key={c.id} className="overflow-hidden">
              <button
                className="w-full p-5 text-left"
                onClick={() => setExpanded(isExpanded ? null : c.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {c.org_nr && <span>Org.nr: {c.org_nr}</span>}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {getUserCount(c.id)} användare ({getAdminCount(c.id)} admins)
                        </span>
                        <span>Reg: {new Date(c.created_at).toLocaleDateString('sv-SE')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
                    {c.onboarding_completed && (
                      <Badge variant="outline" className="text-green-600 border-green-200">Onboardad</Badge>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Col 1: Company info */}
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold text-foreground mb-2">Företagsinfo</h4>
                    <p><span className="text-muted-foreground">Namn:</span> {c.name}</p>
                    <p><span className="text-muted-foreground">Org.nr:</span> {c.org_nr || '—'}</p>
                    <p><span className="text-muted-foreground">Registrerad:</span> {new Date(c.created_at).toLocaleDateString('sv-SE')}</p>
                    <p><span className="text-muted-foreground">Onboarding:</span> {c.onboarding_completed ? 'Ja' : 'Nej'}</p>
                    {c.stripe_customer_id && (
                      <p>
                        <span className="text-muted-foreground">Stripe kund:</span>{' '}
                        <a href={`https://dashboard.stripe.com/customers/${c.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                          {c.stripe_customer_id.slice(0, 18)}… <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    )}
                    {c.stripe_subscription_id && (
                      <p>
                        <span className="text-muted-foreground">Stripe pren.:</span>{' '}
                        <a href={`https://dashboard.stripe.com/subscriptions/${c.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                          {c.stripe_subscription_id.slice(0, 18)}… <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Col 2: Users */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 text-sm">Användare</h4>
                    {companyProfiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Inga användare</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-1.5 font-medium text-muted-foreground">Namn</th>
                              <th className="text-left py-1.5 font-medium text-muted-foreground">Roll</th>
                              <th className="text-left py-1.5 font-medium text-muted-foreground">E-post</th>
                              <th className="py-1.5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyProfiles.map((p: any) => (
                              <tr key={p.id} className="border-b border-border last:border-0">
                                <td className="py-1.5 text-foreground">{p.full_name}</td>
                                <td className="py-1.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.role}</Badge>
                                </td>
                                <td className="py-1.5 text-muted-foreground">{p.email}</td>
                                <td className="py-1.5">
                                  {p.role === 'driver' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs gap-1"
                                      onClick={(e) => { e.stopPropagation(); setResetDialog({ userId: p.id, name: p.full_name }); }}
                                    >
                                      <KeyRound className="h-3 w-3" /> Återställ
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Col 3: Actions */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground mb-2 text-sm">Åtgärder</h4>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                          <Power className="h-3.5 w-3.5 text-green-600" /> Manuellt aktivera
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Aktivera utan betalning?</AlertDialogTitle>
                          <AlertDialogDescription>Detta sätter prenumerationsstatus till "aktiv" utan att en betalning har genomförts. Användbart för trials och manuella avtal.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction onClick={() => updateStatus.mutate({ id: c.id, status: 'active' })}>Aktivera</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2 justify-start text-destructive">
                          <PowerOff className="h-3.5 w-3.5" /> Inaktivera
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Inaktivera företag?</AlertDialogTitle>
                          <AlertDialogDescription>Företaget förlorar åtkomst till admin-panelen omedelbart.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => updateStatus.mutate({ id: c.id, status: 'cancelled' })}>Inaktivera</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 justify-start"
                      onClick={() => sendWelcome.mutate({ companyId: c.id })}
                      disabled={sendWelcome.isPending}
                    >
                      <Mail className="h-3.5 w-3.5" /> Skicka välkomstmail
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                          <Gift className="h-3.5 w-3.5 text-blue-600" /> Ge 14 dagars trial
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Starta 14 dagars trial?</AlertDialogTitle>
                          <AlertDialogDescription>Företaget aktiveras omedelbart och får tillgång i 14 dagar utan betalning.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction onClick={() => updateStatus.mutate({ id: c.id, status: 'active', trialDays: 14 })}>Starta trial</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Inga företag matchar sökningen.</p>
          </div>
        )}
      </div>

      {/* Reset password dialog */}
      <Dialog open={!!resetDialog} onOpenChange={(open) => { if (!open) { setResetDialog(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Återställ lösenord — {resetDialog?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Nytt lösenord"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResetDialog(null); setNewPassword(''); }}>Avbryt</Button>
            <Button
              onClick={() => resetDialog && resetPassword.mutate({ userId: resetDialog.userId, password: newPassword })}
              disabled={!newPassword.trim() || resetPassword.isPending}
            >
              Återställ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create company dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setCreateOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{createResult ? 'Företag skapat!' : 'Skapa nytt företag'}</DialogTitle>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Företaget och admin-kontot har skapats. Dela uppgifterna nedan med kunden.</p>

              {createResult.checkout_url && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Betalningslänk (Stripe)</Label>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs truncate flex-1">{createResult.checkout_url}</span>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(createResult.checkout_url!, 'Betalningslänk')}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tillfälligt lösenord</Label>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                  <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                  <code className="text-sm font-mono flex-1">{createResult.temp_password}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(createResult.temp_password, 'Lösenord')}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Kunden loggar in med sin e-post och detta lösenord. Be dem byta lösenord efter första inloggning.</p>
              </div>

              <Button variant="outline" className="w-full" onClick={handleCloseCreate}>Stäng</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Skapar företag, admin-konto och genererar en betalningslänk via Stripe.</p>
              <div className="space-y-2">
                <Label>Företagsnamn *</Label>
                <Input placeholder="AB Företaget" value={createForm.companyName} onChange={(e) => setCreateForm(f => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Organisationsnummer</Label>
                <Input placeholder="556XXX-XXXX" value={createForm.orgNr} onChange={(e) => setCreateForm(f => ({ ...f, orgNr: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Kontaktperson (admin) *</Label>
                <Input placeholder="Förnamn Efternamn" value={createForm.adminName} onChange={(e) => setCreateForm(f => ({ ...f, adminName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>E-post *</Label>
                <Input type="email" placeholder="admin@foretaget.se" value={createForm.adminEmail} onChange={(e) => setCreateForm(f => ({ ...f, adminEmail: e.target.value }))} />
              </div>
              <Button onClick={handleCreateCompany} className="w-full" disabled={creatingCompany}>
                <Plus className="h-4 w-4 mr-1" /> {creatingCompany ? 'Skapar...' : 'Skapa företag & generera länk'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}
