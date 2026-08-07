import { Sparkles, X } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';

export function DemoBanner() {
  const { enabled, disable } = useDemoMode();
  if (!enabled) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
      <div className="flex items-center gap-3 px-4 md:px-6 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Exempeldata visas
        </span>
        <span className="hidden sm:inline text-amber-800/80 dark:text-amber-200/70">
          Visas bara i tomma vyer. Din egen data påverkas inte.
        </span>
        <button
          onClick={disable}
          className="ml-auto inline-flex items-center gap-1 hover:text-amber-950 dark:hover:text-amber-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Ta bort exempeldata
        </button>
      </div>
    </div>
  );
}