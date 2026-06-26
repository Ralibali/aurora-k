import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAssignment, useDriverUpdateAssignment } from '@/hooks/useData';
import { DeliveryProofDialog } from '@/features/delivery-proof/DeliveryProofDialog';
import type { DeliveryProofResult } from '@/features/delivery-proof/delivery-proof-service';

export function DriverDeliveryProofRuntime() {
  const location = useLocation();
  const assignmentId = location.pathname.match(/^\/driver\/assignment\/([^/]+)$/)?.[1];
  const { user, companyId } = useAuth();
  const { data: assignment } = useAssignment(assignmentId);
  const updateAssignment = useDriverUpdateAssignment();
  const [open, setOpen] = useState(false);

  if (!assignment || !user?.id || assignment.status !== 'active') return null;
  const record = assignment as typeof assignment & {
    require_photo?: boolean | null;
    require_signature?: boolean | null;
    consignment_photo_url?: string | null;
    signature_url?: string | null;
  };

  const complete = async (proof: DeliveryProofResult) => {
    const stamp = new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
    const details = [proof.recipientName && `Mottagare: ${proof.recipientName}`, proof.note].filter(Boolean).join(' · ');
    const event = `[${stamp}] Uppdrag slutfört${details ? `: ${details}` : ''}`;
    await updateAssignment.mutateAsync({
      id: assignment.id,
      status: 'completed',
      actual_stop: new Date().toISOString(),
      consignment_photo_url: proof.photoUrl,
      signature_url: proof.signatureUrl,
      driver_comment: [assignment.driver_comment, event].filter(Boolean).join('\n'),
    });
  };

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
