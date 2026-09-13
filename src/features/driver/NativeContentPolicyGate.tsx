import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { DriverContentPolicy } from './DriverContentPolicy';
import { acceptContentPolicy, CONTENT_POLICY_VERSION, readContentPolicyAcceptance } from './content-policy';

export function NativeContentPolicyGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  if (!user?.id) return null; // ProtectedRoute owns authentication and role checks.
  // An account change must reset both the saved decision and the unchecked form.
  return <UserContentPolicyGate key={`${user.id}:${CONTENT_POLICY_VERSION}`} userId={user.id} signOut={signOut}>{children}</UserContentPolicyGate>;
}

function UserContentPolicyGate({ userId, signOut, children }: { userId: string; signOut: () => Promise<void>; children: ReactNode }) {
  const [acceptance, setAcceptance] = useState(() => readContentPolicyAcceptance(userId));
  const [checked, setChecked] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  useEffect(() => {
    const refresh = () => setAcceptance(readContentPolicyAcceptance(userId));
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!checked || signingOut || acceptance === 'storage-error') return;
    if (acceptContentPolicy(userId)) {
      setSaveError(false);
      setAcceptance('accepted');
    } else {
      setSaveError(true);
    }
  };

  const leave = async () => {
    setSigningOut(true);
    setSignOutError(false);
    try { await signOut(); }
    catch { setSignOutError(true); }
    finally { setSigningOut(false); }
  };

  if (acceptance === 'accepted') return <>{children}</>;
  return (
    <main className="min-h-screen bg-background px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Aurora Transport</p>
          <h1 className="text-2xl font-semibold">Regler för innehåll</h1>
        </div>
        <DriverContentPolicy />
        <form onSubmit={submit} className="space-y-4">
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-4">
            <Checkbox className="mt-0.5" checked={checked} disabled={signingOut || acceptance === 'storage-error'} onCheckedChange={value => setChecked(value === true)} />
            <span className="text-sm">Jag har läst och godkänner reglerna för innehåll.</span>
          </label>
          {acceptance === 'storage-error' && <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>Mobilens lagring kunde inte läsas. Reglerna måste kunna sparas innan du fortsätter.</p>
            <Button type="button" variant="outline" onClick={() => setAcceptance(readContentPolicyAcceptance(userId))}>Försök läsa igen</Button>
          </div>}
          {saveError && <p role="alert" className="text-sm text-destructive">Godkännandet kunde inte sparas i mobilen. Försök igen. Inget material har skickats från den här vyn.</p>}
          <Button type="submit" className="min-h-12 w-full" disabled={!checked || signingOut || acceptance === 'storage-error'}>Godkänn och fortsätt</Button>
        </form>
        <p className="text-xs text-muted-foreground">Godkännandet sparas för ditt konto på den här mobilen.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={signingOut} onClick={() => void leave()}>{signingOut ? 'Loggar ut…' : 'Logga ut'}</Button>
          <Link className="text-sm text-primary underline underline-offset-4" to="/privacy">Integritetspolicy</Link>
        </div>
        {signOutError && <p role="alert" className="text-sm text-destructive">Det gick inte att logga ut. Försök igen.</p>}
      </div>
    </main>
  );
}
