import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CloudUpload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAssignment } from '@/hooks/useData';
import { DeliveryProofDialog } from '@/features/delivery-proof/DeliveryProofDialog';
import type { DeliveryProofResult } from '@/features/delivery-proof/delivery-proof-service';
import { listDriverOperations } from '@/lib/driver-offline-queue';

export function DriverDeliveryProofRuntime() {
  const location = useLocation();
  const assignmentId = location.pathname.match(/^\/driver\/assignment\/([^/]+)$/)?.[1];
  const { user, companyId } = useAuth();
  const { data: assignment } = useAssignment(assignmentId);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pendingProof, setPendingProof] = useState(false);

  const refreshPending = useCallback(async () => {
    if (!assignmentId) return;
    const operations = await listDriverOperations();
    const pending = operations.some(operation => operation.assignmentId === assignmentId && operation.operationType === 'delivery_proof');
    setPendingProof(previous => {
      if (previous && !pending) {
        void queryClient.invalidateQueries({ queryKey: ['assignment', assignmentId] });
        void queryClient.invalidateQueries({ queryKey: ['assignments'] });
      }
      return pending;
    });
  }, [assignmentId, queryClient]);

  useEffect(() => {
    void refreshPending();
    const handler = () => void refreshPending();
    window.addEventListener('aurora-offline-queue-change', handler);
    return () => window.removeEventListener('aurora-offline-queue-change', handler);
  }, [refreshPending]);

  if (!assignment || !user?.id || assignment.status !== 'active') return null;
  const record = assignment as typeof assignment & {
    require_photo?: boolean | null;
    require_signature?: boolean | null;
    consignment_photo_url?: string | null;
    signature_url?: string | null;
  };

  const complete = async (proof: DeliveryProofResult) => {
    if (proof.queued) setPendingProof(true);
    else {
      await queryClient.invalidateQueries({ queryKey: ['assignment', assignment.id] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    }
  };

  if (pendingProof) return <div className="fixed inset-x-0 bottom-0 z-[45] border-t border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm font-semibold text-amber-900" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}><CloudUpload className="mr-2 inline h-5 w-5" />Leveransbevis väntar på säker synk</div>;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[45] border-t bg-card/95 px-5 py-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button className="h-14 w-full bg-green-600 text-base hover:bg-green-700" onClick={() => setOpen(true)}>
          <CheckCircle2 className="mr-2 h-5 w-5" /> Slutför med leveransbevis
        </Button>
      </div>
      <DeliveryProofDialog open={open} onOpenChange={setOpen} assignment={record} userId={user.id} companyId={companyId} onComplete={complete} />
    </>
  );
}
