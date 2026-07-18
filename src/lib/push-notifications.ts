import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

let registrationListener: PluginListenerHandle | null = null;
let registrationErrorListener: PluginListenerHandle | null = null;
let registeredUserId: string | null = null;
let registeredToken: string | null = null;

const pushTokenTable = () => supabase.from('driver_push_tokens');

export function isNativePushAvailable() {
  return Capacitor.isNativePlatform();
}

export async function registerCurrentDeviceForDriverPush(userId: string) {
  if (!isNativePushAvailable()) return;
  if (registeredUserId === userId && registeredToken) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await registrationListener?.remove();
  await registrationErrorListener?.remove();

  registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
    registeredUserId = userId;
    registeredToken = token.value;

    const { error } = await pushTokenTable().upsert(
      {
        user_id: userId,
        token: token.value,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    if (error) console.warn('[push] failed to upsert driver token', error);
  });

  registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
    console.warn('[push] registration failed', error);
  });

  await PushNotifications.register();
}

export async function removeCurrentDevicePushToken(userId?: string | null) {
  if (!isNativePushAvailable()) return;
  const ownerId = userId ?? registeredUserId;
  if (!ownerId) return;

  if (registeredToken) {
    const { error } = await pushTokenTable()
      .delete()
      .eq('user_id', ownerId)
      .eq('token', registeredToken);

    if (error) console.warn('[push] failed to delete driver token', error);
  } else {
    const { error } = await pushTokenTable().delete().eq('user_id', ownerId);
    if (error) console.warn('[push] failed to delete driver tokens', error);
  }

  registeredUserId = null;
  registeredToken = null;
  await registrationListener?.remove();
  await registrationErrorListener?.remove();
  registrationListener = null;
  registrationErrorListener = null;
}
