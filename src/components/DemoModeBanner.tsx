import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';

export function DemoModeBanner({ onDisable }: { onDisable: () => void }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-blue-600 p-2 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">Demo mode är aktivt</p>
              <Badge variant="outline" className="border-blue-300 bg-white text-blue-700">Sälj-demo</Badge>
            </div>
            <p className="mt-1 text-sm text-blue-800">
              Du ser realistisk exempeldata när kontot är tomt. Inget demo-innehåll skrivs till databasen.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDisable} className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100">
          <X className="mr-1 h-4 w-4" /> Stäng av
        </Button>
      </div>
    </div>
  );
}
