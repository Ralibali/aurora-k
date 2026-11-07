import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useData';
import { User, Lock, Mail, Shield, CircleDot, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffectiveDriverSettings } from '@/hooks/useDriverSettings';
import { useDriverDocuments, openDriverDocumentAttachment, DRIVER_DOC_TYPES } from '@/hooks/useCompliance';

export default function DriverProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const { data: driverSettings } = useEffectiveDriverSettings(user?.id);
  const { data: driverDocuments, isLoading: documentsLoading, error: documentsError } = useDriverDocuments();
  const ownDocuments = (driverDocuments ?? []).filter(document => document.driver_id === user?.id);

  const viewDriverDocument = async (path: string) => {
    try { await openDriverDocumentAttachment(path); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Kunde inte öppna bilagan'); }
  };
  const showAvailability = driverSettings?.show_availability_toggle ?? true;

  const isAvailable = profile?.is_available ?? true;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Lösenordet måste vara minst 6 tecken'); return; }
    if (newPassword !== confirmPassword) { toast.error('Lösenorden matchar inte'); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error('Kunde inte ändra lösenord: ' + error.message); }
    else { toast.success('Lösenordet har ändrats!'); setNewPassword(''); setConfirmPassword(''); }
    setChangingPw(false);
  };

  const handleToggleAvailability = async () => {
    if (!user?.id) return;
    setTogglingAvailability(true);
    const { error } = await supabase.from('profiles').update({ is_available: !isAvailable }).eq('id', user.id);
    if (error) { toast.error('Kunde inte uppdatera status'); }
    else { toast.success(!isAvailable ? 'Du är nu tillgänglig' : 'Du är nu otillgänglig'); }
    setTogglingAvailability(false);
  };

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Profile card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-primary/80 to-primary" />
          <CardContent className="pt-0 -mt-10 text-center pb-6">
            <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center mx-auto shadow-md">
              <User className="h-9 w-9 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-32 mx-auto mt-3" />
            ) : (
              <div className="mt-3 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">{profile?.full_name || user?.email}</h2>
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{profile?.email || user?.email}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
                  <Shield className="h-3 w-3" />
                  <span>Chaufför</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability toggle */}
        {showAvailability && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CircleDot className={`h-5 w-5 ${isAvailable ? 'text-success' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Tillgänglighetsstatus</p>
                    <p className="text-xs text-muted-foreground">{isAvailable ? 'Ledig för uppdrag' : 'Inte tillgänglig'}</p>
                  </div>
                </div>
                <Switch
                  checked={isAvailable}
                  onCheckedChange={handleToggleAvailability}
                  disabled={togglingAvailability || isLoading}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* My compliance documents (tenant- and user-restricted by RLS) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Mina dokument
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Dokument och utgångsdatum som företaget har registrerat. Internt granskad betyder inte registerverifierad.
            </p>
            {documentsLoading ? <Skeleton className="h-12 w-full" /> : documentsError ? (
              <p className="text-sm text-destructive">Kunde inte läsa dina dokument.</p>
            ) : ownDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga dokument är registrerade för dig ännu.</p>
            ) : ownDocuments.map(document => (
              <div key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {DRIVER_DOC_TYPES.find(item => item.value === document.doc_type)?.label ?? document.doc_type}
                    {document.label ? ' – ' + document.label : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {document.expires_at ? 'Registrerat utgångsdatum: ' + document.expires_at : 'Inget utgångsdatum'}
                    {' · '}
                    {document.storage_path ? (
                      document.review_status === 'approved' ? 'Internt granskad' :
                      document.review_status === 'rejected' ? 'Avvisad' : 'Inväntar granskning'
                    ) : 'Ingen bilaga'}
                  </p>
                </div>
                {document.storage_path && (
                  <Button variant="outline" size="sm" onClick={() => void viewDriverDocument(document.storage_path!)}>
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Visa
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" /> Byt lösenord
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-pw">Nytt lösenord</Label>
                <Input id="new-pw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minst 6 tecken" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw">Bekräfta lösenord</Label>
                <Input id="confirm-pw" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Upprepa lösenordet" required />
              </div>
              <Button type="submit" className="w-full touch-target" disabled={changingPw}>
                {changingPw ? 'Sparar...' : 'Spara nytt lösenord'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full touch-target text-destructive hover:text-destructive hover:bg-destructive/5" onClick={handleLogout}>
          Logga ut
        </Button>
      </div>
    </>
  );
}
