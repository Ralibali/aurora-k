import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Global offline banner. Shows when the browser reports offline.
 * Important for a mobile-first driver app where connectivity drops.
 */
export function NetworkStatusBanner() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>Du är offline — ändringar synkas när anslutningen kommer tillbaka.</span>
    </div>
  );
}
