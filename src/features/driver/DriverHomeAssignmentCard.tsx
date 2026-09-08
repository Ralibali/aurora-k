import { ChevronRight, MapPin, Package, Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { formatStockholmTime, getStockholmDateKey } from '@/features/dispatch/dispatch-utils';
import { driverAssignmentPath } from './assignment-flow';

type Assignment = {
  id: string;
  title: string;
  status: string;
  scheduled_start: string;
  pickup_address?: string | null;
  delivery_address?: string | null;
  address?: string | null;
  service_type?: string | null;
  customer?: { name?: string | null } | null;
};

export function DriverHomeAssignmentCard({ assignment, primary = false, sequence }: {
  assignment: Assignment;
  primary?: boolean;
  sequence?: number;
}) {
  const pickup = assignment.pickup_address || assignment.address || 'Adress saknas';
  const route = assignment.delivery_address ? `${pickup} → ${assignment.delivery_address}` : pickup;

  if (!primary) {
    return (
      <Link to={driverAssignmentPath(assignment.id)} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 active:scale-[0.99]">
        {sequence && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{sequence}</div>}
        <div className="shrink-0 font-mono text-sm font-bold">{formatStockholmTime(assignment.scheduled_start)}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{getStockholmDateKey(assignment.scheduled_start)}</span></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{assignment.title}</p><p className="truncate text-xs text-muted-foreground">{route}</p><div className="mt-1"><StatusBadge status={assignment.status} /></div></div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <Link to={driverAssignmentPath(assignment.id)} className="block">
      <div className="space-y-3 rounded-xl bg-[#1E40AF] p-5 text-white transition-transform active:scale-[0.98]">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-blue-200">Uppdrag #{assignment.id.slice(0, 8).toUpperCase()}</p>
          {assignment.service_type && <Badge className="bg-white/15 text-white"><Package className="mr-1 h-3 w-3" />{assignment.service_type}</Badge>}
        </div>
        <p className="text-xl font-semibold">{assignment.title}</p>
        <p className="font-mono text-3xl font-bold">{formatStockholmTime(assignment.scheduled_start)}<span className="ml-3 text-xs font-normal text-blue-200">{getStockholmDateKey(assignment.scheduled_start)}</span></p>
        <div className="space-y-2 rounded-lg bg-white/10 p-3 text-sm text-blue-100">
          <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="text-white">Hämta:</strong> {pickup}</span></p>
          {assignment.delivery_address && <p className="flex gap-2"><Route className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="text-white">Lämna:</strong> {assignment.delivery_address}</span></p>}
        </div>
        {assignment.customer?.name && <p className="text-xs text-blue-200">{assignment.customer.name}</p>}
        <div className="rounded-lg bg-white py-3 text-center font-semibold text-blue-700">
          {['active', 'delayed'].includes(assignment.status) ? 'Fortsätt körning' : 'Öppna och starta körning'}
        </div>
      </div>
    </Link>
  );
}
