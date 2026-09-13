import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { useAuth } from '@/hooks/useAuth';
import { isNativePushAvailable, registerCurrentDeviceForDriverPush, startCurrentDeviceForDriverPush, removeCurrentDevicePushToken } from '@/lib/push-notifications';
import { subscribeAppConnectivity } from '@/lib/app-connectivity';

export function DriverPushNotifications() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || role !== 'driver' || !isNativePushAvailable()) return;

    let active = true;
    const retry = () => {
      if (active) void registerCurrentDeviceForDriverPush(user.id).catch(() => {
        console.warn('[push] Driver registration unavailable');
      });
    };
    void startCurrentDeviceForDriverPush(user.id).catch(() => {
      console.warn('[push] Driver registration unavailable');
    });
    const unsubscribe = subscribeAppConnectivity(online => { if (online) retry(); });
    const visible = () => { if (document.visibilityState === 'visible') retry(); };
    document.addEventListener('visibilitychange', visible);
    let resume: { remove: () => Promise<void> } | null = null;
    void App.addListener('appStateChange', ({ isActive }) => { if (isActive) retry(); })
      .then(handle => { if (active) resume = handle; else void handle.remove().catch(() => {}); })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', visible);
      void resume?.remove().catch(() => {});
      void removeCurrentDevicePushToken(user.id).catch(() => {});
    };
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
