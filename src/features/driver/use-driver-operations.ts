import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { listDriverOperations, type DriverOfflineOperation } from '@/lib/driver-offline-queue';

export function useDriverOperations(assignmentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scope = `${user?.id ?? ''}:${assignmentId ?? ''}`;
  const [snapshot, setSnapshot] = useState<{ scope: string; operations: DriverOfflineOperation[]; error: string }>({ scope: '', operations: [], error: '' });
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try {
        const rows = user?.id && assignmentId ? await listDriverOperations() : [];
        if (active && request === revision) setSnapshot({ scope, operations: rows.filter(row => row.assignmentId === assignmentId), error: '' });
      } catch {
        if (active && request === revision) setSnapshot({ scope, operations: [], error: 'Mobilens lagring kunde inte öppnas. Försök igen innan du fortsätter.' });
      }
    };
    void refresh();
    const changed = () => {
      void refresh();
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    };
    window.addEventListener('aurora-offline-queue-change', changed);
    return () => { active = false; window.removeEventListener('aurora-offline-queue-change', changed); };
  }, [assignmentId, user?.id, scope, queryClient]);
  const operations = snapshot.scope === scope ? snapshot.operations : [];
  return {
    operations, loading: snapshot.scope !== scope, error: snapshot.scope === scope ? snapshot.error : '',
    queuedStart: operations.some(row => row.operationType === 'assignment_status' && row.metadata.status === 'active' && !row.rejected),
    proof: operations.find(row => row.operationType === 'delivery_proof'),
    rejected: operations.find(row => row.rejected),
  };
}
