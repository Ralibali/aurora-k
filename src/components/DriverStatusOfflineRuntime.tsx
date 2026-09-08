import { useState } from 'react';
import { Play } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAssignment } from '@/hooks/useData';
import { syncOrQueueDriverOperation } from '@/lib/driver-offline-queue';
import { canStartDriverAssignment, driverAssignmentId } from '@/features/driver/assignment-flow';
import { useDriverOperations } from '@/features/driver/use-driver-operations';

export function DriverStatusOfflineRuntime() {
  const { pathname } = useLocation();
  const assignmentId = driverAssignmentId(pathname);
  const { data: assignment } = useAssignment(assignmentId);
  const queryClient = useQueryClient();
  const pending = useDriverOperations(assignmentId);
  const [saving, setSaving] = useState(false);
  if (!assignment || !canStartDriverAssignment(assignment) || pending.queuedStart || pending.proof) return null;
  const start = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await syncOrQueueDriverOperation({ assignmentId: assignment.id, operationType: 'assignment_status', metadata: { status: 'active', changedAt: new Date().toISOString() } });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success(result.queued ? 'Starten är sparad i mobilen och väntar på synk' : 'Körningen är startad');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte spara starten');
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    } finally { setSaving(false); }
  };
  return <div className="fixed inset-x-0 bottom-0 z-[46] border-t bg-card/95 px-5 py-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
    {pending.error || pending.rejected ? <p role="alert" className="text-sm text-destructive">{pending.error || pending.rejected?.lastError} Granska den sparade ändringen ovan.</p> : <Button disabled={saving || pending.loading} className="h-14 w-full text-base" onClick={() => void start()}><Play className="mr-2 h-5 w-5" />{saving ? 'Sparar…' : 'Starta körning'}</Button>}
  </div>;
}
