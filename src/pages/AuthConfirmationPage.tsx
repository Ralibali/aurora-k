import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePageMeta } from '@/lib/use-page-meta';

type Confirmation = { token_hash: string; type: 'signup' | 'recovery' };

function takeConfirmationFragment(): Confirmation | null {
  if (typeof window === 'undefined' || window.location.pathname !== '/auth/confirm') return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  // Keep the bearer token in this page's memory only, never in a query string,
  // storage, outgoing navigation or telemetry URL. Ignore all redirect inputs.
  window.history.replaceState(window.history.state, '', '/auth/confirm');
  const token_hash = params.get('token_hash') ?? '';
  const type = params.get('type');
  if (params.getAll('token_hash').length !== 1 || params.getAll('type').length !== 1 || !/^[A-Za-z0-9_-]{16,512}$/.test(token_hash) || (type !== 'signup' && type !== 'recovery')) return null;
  return { token_hash, type };
}

// Eagerly imported by App: scrub a fresh email link before main.tsx initializes
// Sentry or other telemetry. The page also handles ordinary SPA navigation.
let initialConfirmation = takeConfirmationFragment();

export default function AuthConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmation, setConfirmation] = useState(initialConfirmation);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const requestPending = useRef(false);
  const revision = useRef(0);

  usePageMeta({ title: 'Bekräfta e-post | Aurora Transport', description: '', canonical: 'https://auroratransport.se/auth/confirm', noindex: true });

  useLayoutEffect(() => {
    if (!location.hash && !location.search) return;
    revision.current += 1;
    setConfirmation(takeConfirmationFragment());
    setError('');
    navigate('/auth/confirm', { replace: true });
  }, [location.hash, location.search, navigate]);

  useEffect(() => {
    initialConfirmation = null;
    mounted.current = true;
    return () => { mounted.current = false; revision.current += 1; };
  }, []);

  const confirm = async () => {
    if (!confirmation || requestPending.current) return;
    requestPending.current = true;
    const attempt = revision.current;
    setPending(true);
    setError('');
    try {
      // verifyOtp saves the returned session and emits SIGNED_IN or
      // PASSWORD_RECOVERY. It has no AbortSignal option: keep retries locked
      // until it settles, and never navigate from an abandoned/stale attempt.
      const { data, error: verificationError } = await supabase.auth.verifyOtp(confirmation);
      if (!mounted.current || attempt !== revision.current) return;
      if (verificationError || !data.session?.access_token || !data.session.user?.id) {
        setError('Länken kunde inte bekräftas. Den kan ha gått ut eller redan använts. Begär ett nytt mejl om det inte hjälper att försöka igen.');
        return;
      }
      navigate(confirmation.type === 'recovery' ? '/reset-password' : '/register?confirmed=1', { replace: true });
    } catch {
      if (mounted.current && attempt === revision.current) setError('Det gick inte att ansluta. Kontrollera din anslutning och försök igen.');
    } finally {
      requestPending.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const recovery = confirmation?.type === 'recovery';
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
      <MailCheck className="h-9 w-9 text-primary" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{recovery ? 'Återställ ditt lösenord' : 'Bekräfta din e-post'}</h1>
      {confirmation ? <>
        <p className="text-sm text-muted-foreground">{recovery ? 'Bekräfta att du vill återställa lösenordet. Därefter kan du välja ett nytt.' : 'Bekräfta din e-postadress för att fortsätta registreringen av ditt företag.'}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={pending} onClick={() => void confirm()}>{pending ? 'Bekräftar…' : error ? 'Försök igen' : recovery ? 'Fortsätt till lösenordsbyte' : 'Bekräfta e-post och fortsätt'}</Button>
      </> : <p role="alert" className="text-sm text-destructive">Länken saknas eller är ogiltig. Öppna hela länken i mejlet eller begär ett nytt mejl.</p>}
      {(error || !confirmation) && <Button className="w-full" variant="outline" disabled={pending} onClick={() => navigate(recovery ? '/forgot-password' : '/register')}>Begär ett nytt mejl</Button>}
      <Button className="w-full" variant="ghost" disabled={pending} onClick={() => navigate('/login', { replace: true })}>Tillbaka till inloggning</Button>
    </div>
  </main>;
}
