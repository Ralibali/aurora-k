import { Badge } from '@/components/ui/badge';
import { checkItems, answerLabels, type VehicleCheck } from './vehicle-check';
import { formatSwedishDateTime } from '@/lib/format';

export function VehicleCheckHistory({ check }: { check: VehicleCheck }) {
  return <div className="space-y-2 break-words">
    <div className="flex flex-wrap items-center gap-2">
      <time className="text-sm text-muted-foreground">{formatSwedishDateTime(check.created_at)}</time>
      <Badge variant={check.status === 'open' ? 'destructive' : 'secondary'}>{check.status === 'open' ? 'Öppen avvikelse' : check.status === 'resolved' ? 'Avslutad avvikelse' : 'Kontroll registrerad'}</Badge>
      {check.safety_critical && <Badge variant="destructive">Säkerhetskritisk</Badge>}
    </div>
    <dl className="grid gap-1 text-sm">{checkItems.map(item => <div key={item.key} className="flex flex-wrap gap-x-2"><dt className="font-medium">{item.label}:</dt><dd>{answerLabels[check[item.key]]}</dd></div>)}</dl>
    {check.note && <p className="whitespace-pre-wrap text-sm">{check.note}</p>}
    {check.resolution && <p className="whitespace-pre-wrap text-sm"><strong>Åtgärd:</strong> {check.resolution}{check.resolved_at && <span className="block text-xs text-muted-foreground">{formatSwedishDateTime(check.resolved_at)}</span>}</p>}
  </div>;
}