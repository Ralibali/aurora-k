import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { fortnox, FORTNOX_STATE_KEY } from '@/features/integrations/fortnox-api';

const captured = new URLSearchParams((window as Window & { __auroraTakeFortnoxCallback?: string }).__auroraTakeFortnoxCallback ?? '');
const response = { code: captured.get('code'), state: captured.get('state'), error: captured.get('error') };
for (const key of [...captured.keys()]) captured.delete(key);

export default function FortnoxCallbackPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  let matches = false;
  try { matches = !!response.state && sessionStorage.getItem(FORTNOX_STATE_KEY) === response.state; } catch { /* Storage can be unavailable. Fail closed. */ }
  const valid = matches && !!response.code && !response.error;
  const finish = async () => {
    if (!valid || !user || busy) return;
    setBusy(true);
    try {
      await fortnox('complete', { code: response.code, state: response.state });
      sessionStorage.removeItem(FORTNOX_STATE_KEY);
      response.code = null; response.state = null;
      setComplete(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Anslutningen kunde inte slutföras.'); }
    finally { setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
    <h1 className="text-2xl font-bold">{complete ? 'Fortnox är anslutet' : 'Anslut företaget till Fortnox'}</h1>
    {complete ? <p>Bolagets organisationsnummer är verifierat. Du kan nu exportera fakturautkast från faktureringen.</p> : <>
      <p className="text-sm text-muted-foreground">Bekräfta för att ansluta det valda Fortnox-bolaget till ditt företag i Aurora.</p>
      {!valid && <p role="alert">{response.error ? 'Anslutningen avbröts hos Fortnox.' : 'Anslutningsförsöket saknas eller har gått ut. Börja om från inställningarna.'}</p>}
      {!loading && !user && <p role="alert">Logga in på Aurora och starta anslutningen igen.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={!valid || loading || !user || busy} onClick={finish}>{busy ? 'Verifierar bolaget…' : 'Bekräfta anslutning'}</Button>
    </>}
    <Button variant="outline" className="w-full" asChild><Link to="/admin/settings?section=integrations">Till inställningarna</Link></Button>
  </div></main>;
}
