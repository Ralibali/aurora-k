import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '@/hooks/useAuth';
import { isNativePushAvailable, registerCurrentDeviceForDriverPush } from '@/lib/push-notifications';

export function DriverPushNotifications() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || role !== 'driver' || !isNativePushAvailable()) return;

    registerCurrentDeviceForDriverPush(user.id).catch((err) => {
      console.warn('[push] driver registration failed', err);
    });
  }, [role, user?.id]);

  useEffect(() => {
    if (!isNativePushAvailable()) return;

    let remove = false;
    let listener: { remove: () => Promise<void> } | null = null;

    PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event.notification.data as Record<string, string | undefined> | undefined;
      const assignmentId = data?.assignmentId ?? data?.assignment_id;
      if (!assignmentId) return;
      navigate(`/driver/assignments/${assignmentId}`);
    }).then((handle) => {
      if (remove) {
        handle.remove().catch(console.warn);
      } else {
        listener = handle;
      }
    }).catch((err) => console.warn('[push] action listener failed', err));

    return () => {
      remove = true;
      listener?.remove().catch(console.warn);
    };
  }, [navigate]);

  return null;
}
