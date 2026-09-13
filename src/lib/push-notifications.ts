import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { isAppOnline } from '@/lib/app-connectivity';

type PushSession = {
  userId: string;
  token: string | null;
  savedToken: string | null;
  knownTokens: Set<string>;
  handles: PluginListenerHandle[];
  ready: Promise<void>;
  writing: Promise<void> | null;
  permitted: boolean;
};
let session: PushSession | null = null;
let cleanup: Promise<void> = Promise.resolve();
const suspendedUsers = new Set<string>();
const pushTokenTable = () => supabase.from('driver_push_tokens');

export function isNativePushAvailable() {
  return Capacitor.isNativePlatform();
}

function savePendingToken(current: PushSession): Promise<void> {
  if (current.writing) return current.writing;
  if (session !== current || !isAppOnline() || !current.token || current.token === current.savedToken) return Promise.resolve();
  current.writing = (async () => {
    while (session === current && isAppOnline() && current.token && current.token !== current.savedToken) {
      const token = current.token;
      try {
        const { error } = await (supabase as unknown as {
          rpc(name: 'register_driver_push_token', args: { p_token: string; p_platform: string }): PromiseLike<{ error: unknown }>;
        }).rpc('register_driver_push_token', { p_token: token, p_platform: Capacitor.getPlatform() });
        if (error) throw error;
        if (session === current) current.savedToken = token;
      } catch {
        // Connectivity and resume retry the token that remains pending.
        console.warn('[push] Could not save device registration');
        return;
      }
    }
  })().finally(() => { current.writing = null; });
  return current.writing;
}

async function prepareSession(current: PushSession) {
  await cleanup;
  if (session !== current) return;
  const permission = await PushNotifications.requestPermissions();
  if (session !== current || permission.receive !== 'granted') return;
  current.permitted = true;
  const keep = async (handle: PluginListenerHandle) => {
    if (session === current) current.handles.push(handle);
    else await handle.remove();
  };
  await keep(await PushNotifications.addListener('registration', (token: Token) => {
    if (session !== current) return;
    current.token = token.value;
    current.knownTokens.add(token.value);
    void savePendingToken(current);
  }));
  if (session !== current) return;
  await keep(await PushNotifications.addListener('registrationError', () => {
    if (session === current) console.warn('[push] Device registration failed');
  }));
  if (session === current) await PushNotifications.register();
}

export async function registerCurrentDeviceForDriverPush(userId: string) {
  if (!isNativePushAvailable() || suspendedUsers.has(userId)) return;
  if (session?.userId === userId) {
    const current = session;
    await current.ready;
    if (session !== current) return;
    if (!current.permitted) {
      const permission = await PushNotifications.checkPermissions();
      if (session !== current || permission.receive !== 'granted') return;
      session = null;
      await registerCurrentDeviceForDriverPush(userId);
      return;
    }
    if (current.token) await savePendingToken(current);
    else await PushNotifications.register();
    return;
  }
  // Detach first so late callbacks from another account cannot write.
  if (session) void removeCurrentDevicePushToken(session.userId);
  const current: PushSession = {
    userId, token: null, savedToken: null, knownTokens: new Set(), handles: [],
    ready: Promise.resolve(), writing: null, permitted: false,
  };
  session = current;
  current.ready = prepareSession(current).catch(async error => {
    if (session === current) session = null;
    await Promise.allSettled(current.handles.map(handle => handle.remove()));
    throw error;
  });
  await current.ready;
}

// Only a new authenticated lifecycle (or a failed logout) can resume registration.
// Connectivity callbacks from the old lifecycle must never undo logout cleanup.
export async function startCurrentDeviceForDriverPush(userId: string) {
  suspendedUsers.delete(userId);
  await registerCurrentDeviceForDriverPush(userId);
}

export async function removeCurrentDevicePushToken(userId?: string | null) {
  if (!isNativePushAvailable()) return;
  const current = session;
  const leavingUser = userId ?? current?.userId;
  if (leavingUser) suspendedUsers.add(leavingUser);
  if (!current || (userId && current.userId !== userId)) return;
  session = null;
  const priorCleanup = cleanup;
  cleanup = (async () => {
    await priorCleanup;
    await current.ready.catch(() => {});
    await Promise.allSettled(current.handles.map(handle => handle.remove()));
    // Finish a write already sent with this account before deleting its token.
    await current.writing;
    for (const token of current.knownTokens) {
      try {
        const { error } = await pushTokenTable().delete().eq('user_id', current.userId).eq('token', token);
        if (error) throw error;
      } catch { console.warn('[push] Could not remove device registration'); }
    }
    // Do not delete other devices when this device's token is unknown.
    try { await PushNotifications.unregister(); }
    catch { console.warn('[push] Could not unregister this device'); }
  })();
  await cleanup;
}
