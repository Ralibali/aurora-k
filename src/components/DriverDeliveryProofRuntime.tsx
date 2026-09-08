import { useState } from 'react';
import { CheckCircle2, CloudUpload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAssignment } from '@/hooks/useData';
import { DeliveryProofDialog } from '@/features/delivery-proof/DeliveryProofDialog';
import { canCompleteDriverAssignment, driverAssignmentId } from '@/features/driver/assignment-flow';
import { useDriverOperations } from '@/features/driver/use-driver-operations';

export function DriverDeliveryProofRuntime() {
  const { pathname } = useLocation();
  const assignmentId = driverAssignmentId(pathname);
  const { user, companyId } = useAuth();
  const { data: assignment } = useAssignment(assignmentId);
  const queryClient = useQueryClient();
  const pending = useDriverOperations(assignmentId);
  const [openFor, setOpenFor] = useState<string | null>(null);
  if (!assignment || !user?.id || !canCompleteDriverAssignment(assignment, pending.queuedStart)) return null;
  if (pending.proof && openFor !== assignment.id) return <div className="fixed inset-x-0 bottom-0 z-[45] border-t border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm font-semibold text-amber-900" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}><CloudUpload className="mr-2 inline h-5 w-5" />{pending.proof.rejected ? 'Leveransbeviset kunde inte godkännas. Granska ändringen ovan.' : 'Leveransbevis sparat i mobilen – väntar på säker synk'}</div>;
  return <>
    <div className="fixed inset-x-0 bottom-0 z-[45] border-t bg-card/95 px-5 py-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      {pending.queuedStart && <p className="mb-2 text-center text-xs text-amber-800">Starten väntar på synk. Du kan spara leveransbeviset under tiden.</p>}
      {pending.error && <p role="alert" className="mb-2 text-sm text-destructive">{pending.error}</p>}
      <Button disabled={Boolean(pending.loading || pending.error || pending.rejected)} className="h-14 w-full bg-green-600 text-base hover:bg-green-700" onClick={() => setOpenFor(assignment.id)}><CheckCircle2 className="mr-2 h-5 w-5" />Slutför med leveransbevis</Button>
    </div>
    <DeliveryProofDialog key={assignment.id} open={openFor === assignment.id} onOpenChange={open => setOpenFor(open ? assignment.id : null)} assignment={assignment} blockedReason={pending.proof ? pending.proof.rejected ? 'Servern kunde inte godkänna beviset. Stäng dialogen och granska den sparade ändringen.' : 'Beviset är sparat i mobilen och väntar på bekräftelse.' : undefined} userId={user.id} companyId={companyId} onComplete={async () => { await queryClient.invalidateQueries({ queryKey: ['assignments'] }); }} />
  </>;
}
