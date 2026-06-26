import { MapPin } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAssignment } from '@/hooks/useData';
import { CustomerStatusLink } from '@/components/admin/CustomerStatusLink';

export function AssignmentCustomerStatusRuntime() {
  const location = useLocation();
  const assignmentId = location.pathname.match(/^\/admin\/assignments\/([^/]+)$/)?.[1];
  const { data: assignment } = useAssignment(assignmentId);
  if (!assignmentId || !assignment) return null;
  const tracking = assignment as typeof assignment & { tracking_token?: string | null; tracking_enabled?: boolean };
  if (!tracking.tracking_token || tracking.tracking_enabled === false) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] rounded-2xl border bg-card p-2 shadow-xl">
      <div className="mb-1 flex items-center gap-1 px-2 text-xs font-semibold"><MapPin className="h-3.5 w-3.5 text-primary" /> Kundstatus</div>
      <CustomerStatusLink token={tracking.tracking_token} />
    </div>
  );
}
