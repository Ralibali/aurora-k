import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { driverOfflineQueueCount, flushDriverOfflineQueue, listDriverOperations } from '@/lib/driver-offline-queue';

export function DriverOfflineSyncRuntime() {
  const [online, setOnline] = useState(navigator.onLine);
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState('');

  const refresh = useCallback(async () => {
    setCount(await driverOfflineQueueCount());
    const operations = await listDriverOperations();
    setLastError(operations.find(operation => operation.lastError)?.lastError ?? '');
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return refresh();
    setSyncing(true);
    try {
      await flushDriverOfflineQueue();
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

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

  if (online && count === 0) return null;
  return <div className={`fixed inset-x-3 top-16 z-[70] rounded-xl border p-3 shadow-lg ${online ? 'border-amber-200 bg-amber-50' : 'border-slate-300 bg-slate-900 text-white'}`}>
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-white/15 p-2">{online ? <CloudUpload className="h-5 w-5 text-amber-700" /> : <WifiOff className="h-5 w-5" />}</div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{online ? `${count} ändring${count === 1 ? '' : 'ar'} väntar på synk` : 'Offline – ändringar sparas i mobilen'}</p>{lastError && <p className={`truncate text-xs ${online ? 'text-amber-800' : 'text-slate-300'}`}>{lastError}</p>}</div>
      {online && count > 0 && <Button size="sm" variant="outline" className="bg-white" disabled={syncing} onClick={() => void flush()}>{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Försök igen'}</Button>}
    </div>
  </div>;
}
