import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAssignments } from '@/hooks/useData';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';

export function DriverLocationRuntime() {
  const { user, companyId } = useAuth();
  const { data: assignments } = useDriverAssignments(user?.id);
  const active = (assignments ?? []).find(item => item.status === 'active');

  const geofence = useMemo(() => {
    const record = active as typeof active & {
      geofence_lat?: number | null;
      geofence_lng?: number | null;
      geofence_radius?: number | null;
    };
    if (record?.geofence_lat == null || record.geofence_lng == null) return null;
    return {
      lat: Number(record.geofence_lat),
      lng: Number(record.geofence_lng),
      radius: Number(record.geofence_radius ?? 150),
    };
  }, [active]);

  useDriverLocationTracker(user?.id, active?.id, companyId, geofence);
  return null;
}
