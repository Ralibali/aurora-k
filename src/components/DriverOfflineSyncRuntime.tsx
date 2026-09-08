import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, Loader2, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { driverAssignmentPath } from '@/features/driver/assignment-flow';
import { discardRejectedDriverOperation, flushDriverOfflineQueue, legacyDriverOperationCount, listDriverOperations, type DriverOfflineOperation } from '@/lib/driver-offline-queue';

export function DriverOfflineSyncRuntime() {
  const { user } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [operations, setOperations] = useState<DriverOfflineOperation[]>([]);
  const [legacyCount, setLegacyCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [storageError, setStorageError] = useState('');
  const refresh = useCallback(async () => {
    if (!user?.id) { setOperations([]); setLegacyCount(0); return; }
    try {
      setOperations(await listDriverOperations());
      setLegacyCount(await legacyDriverOperationCount());
      setStorageError('');
    } catch { setStorageError('Lokal lagring är inte tillgänglig. Ändringar kan inte sparas offline.'); }
  }, [user?.id]);
  const flush = useCallback(async () => {
    if (!navigator.onLine || !user?.id) return refresh();
    setSyncing(true);
    try { await flushDriverOfflineQueue(); }
    catch { setStorageError('Kunde inte läsa eller synka mobilens sparade ändringar.'); }
    finally { setSyncing(false); await refresh(); }
  }, [refresh, user?.id]);
  useEffect(() => {
    void refresh();
    const onlineHandler = () => { setOnline(true); void flush(); };
    const offlineHandler = () => setOnline(false);
    const queueHandler = () => void refresh();
    const visibilityHandler = () => { if (document.visibilityState === 'visible') void flush(); };
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('aurora-offline-queue-change', queueHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
    const interval = window.setInterval(() => { if (navigator.onLine) void flush(); }, 60_000);
    if (navigator.onLine) void flush();
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('aurora-offline-queue-change', queueHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.clearInterval(interval);
    };
  }, [flush, refresh]);
  const rejected = operations.find(row => row.rejected);
  const count = operations.length;
  const lastError = storageError || operations.find(row => row.lastError)?.lastError;
  const discard = async () => {
    if (!rejected || !window.confirm('Ta bort den avvisade ändringen från denna mobil? Sparat foto och signatur för ändringen tas bort. Kontrollera uppdraget och kontakta kontoret först om beviset behöver bevaras.')) return;
    try { await discardRejectedDriverOperation(rejected.id); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Kunde inte ta bort ändringen'); }
  };
  if (online && !count && !legacyCount && !storageError) return null;
  return <div role="status" className={`fixed inset-x-3 top-16 z-[40] max-h-[45vh] overflow-y-auto rounded-xl border p-3 shadow-lg ${online ? 'border-amber-200 bg-amber-50' : 'border-slate-300 bg-slate-900 text-white'}`}>
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-white/15 p-2">{online ? <CloudUpload className="h-5 w-5 text-amber-700" /> : <WifiOff className="h-5 w-5" />}</div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{rejected ? 'En sparad ändring behöver granskas' : online ? `${count} ändring${count === 1 ? '' : 'ar'} väntar på synk` : 'Offline – ändringar sparas i mobilen'}</p>{lastError && <p className={`text-xs ${online ? 'text-amber-800' : 'text-slate-300'}`}>{lastError}</p>}</div>
      {online && count > 0 && !rejected && <Button size="sm" variant="outline" className="bg-white text-slate-900" disabled={syncing} onClick={() => void flush()}>{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Försök igen'}</Button>}
    </div>
    {rejected && <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link to={driverAssignmentPath(rejected.assignmentId)}>Öppna uppdrag</Link></Button><Button size="sm" variant="outline" onClick={() => void discard()}>Ta bort avvisad ändring</Button></div>}
    {legacyCount > 0 && <p className="mt-2 text-xs">{legacyCount} äldre ändringar saknar föraridentitet och skickas inte automatiskt. Kontakta kontoret på denna mobil för att återställa dem säkert.</p>}
  </div>;
}
