import { useState } from 'react';
import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useData';
import { User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function DriverProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Lösenorden matchar inte');
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Kunde inte ändra lösenord: ' + error.message);
    } else {
      toast.success('Lösenordet har ändrats!');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPw(false);
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <User className="h-8 w-8 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <>
                <CardTitle>{profile?.full_name || user?.email}</CardTitle>
                <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
              </>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" /> Byt lösenord
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

        <Button variant="outline" className="w-full touch-target" onClick={handleLogout}>
          Logga ut
        </Button>
      </div>
    </DriverLayout>
  );
}
