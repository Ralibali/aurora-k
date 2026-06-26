import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, Play } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAssignment } from '@/hooks/useData';
import { listDriverOperations, syncOrQueueDriverOperation } from '@/lib/driver-offline-queue';

export function DriverStatusOfflineRuntime() {
  const location = useLocation();
  const assignmentId = location.pathname.match(/^\/driver\/assignment\/([^/]+)$/)?.[1];
  const { data: assignment } = useAssignment(assignmentId);
  const queryClient = useQueryClient();
  const [pendingStart, setPendingStart] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshPending = useCallback(async () => {
    if (!assignmentId) return;
    const operations = await listDriverOperations();
    const pending = operations.some(operation => operation.assignmentId === assignmentId && operation.operationType === 'assignment_status' && operation.metadata.status === 'active');
    setPendingStart(previous => {
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

  if (!assignment || assignment.status !== 'pending') return null;

  const start = async () => {
    setSaving(true);
    const result = await syncOrQueueDriverOperation({
      assignmentId: assignment.id,
      operationType: 'assignment_status',
      metadata: { status: 'active', changedAt: new Date().toISOString() },
    });
    setSaving(false);
    if (result.queued) {
      setPendingStart(true);
      toast.success('Startstatus sparad offline');
    } else {
      await queryClient.invalidateQueries({ queryKey: ['assignment', assignment.id] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Körningen är startad');
    }
  };

  return <div className="fixed inset-x-0 bottom-0 z-[46] border-t bg-card/95 px-5 py-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
    {pendingStart ? <div className="h-14 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900"><CloudUpload className="mr-2 inline h-5 w-5" />Startstatus väntar på synk</div> : <Button disabled={saving} className="h-14 w-full text-base" onClick={() => void start()}><Play className="mr-2 h-5 w-5" />{saving ? 'Sparar…' : 'Starta körning'}</Button>}
  </div>;
}
