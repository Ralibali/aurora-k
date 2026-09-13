import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  native: true, online: true,
  permissions: vi.fn(), checkPermissions: vi.fn(), register: vi.fn(), unregister: vi.fn(),
  rpc: vi.fn(), remove: vi.fn(),
  callbacks: [] as Array<{ event: string; callback: (value: { value: string }) => void; remove: ReturnType<typeof vi.fn> }>,
  deletes: [] as Array<Array<[string, string]>>,
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => 'ios' } }));
vi.mock('@/lib/app-connectivity', () => ({ isAppOnline: () => mocks.online }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: {
  requestPermissions: mocks.permissions, checkPermissions: mocks.checkPermissions,
  register: mocks.register, unregister: mocks.unregister,
  addListener: vi.fn(async (event, callback) => {
    const remove = vi.fn().mockResolvedValue(undefined);
    mocks.callbacks.push({ event, callback, remove });
    return { remove };
  }),
} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: () => ({
  delete: () => {
    const filters: Array<[string, string]> = [];
    mocks.deletes.push(filters);
    return { eq: (column: string, value: string) => {
      filters.push([column, value]);
      return { eq: async (secondColumn: string, secondValue: string) => {
        filters.push([secondColumn, secondValue]);
        return { error: null };
      } };
    } };
  },
}) } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const token = (value: string) => mocks.callbacks.filter(item => item.event === 'registration').at(-1)!.callback({ value });

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  mocks.native = true; mocks.online = true; mocks.callbacks.length = 0; mocks.deletes.length = 0;
  mocks.permissions.mockReset().mockResolvedValue({ receive: 'granted' });
  mocks.checkPermissions.mockReset().mockResolvedValue({ receive: 'granted' });
  mocks.rpc.mockReset().mockResolvedValue({ error: null });
  mocks.register.mockReset().mockResolvedValue(undefined);
  mocks.unregister.mockReset().mockResolvedValue(undefined);
});

describe('driver push registration', () => {
  it('retries a failed token write and records success only after it is saved', async () => {
    const push = await import('./push-notifications');
    mocks.rpc.mockResolvedValueOnce({ error: new Error('offline') });
    await push.registerCurrentDeviceForDriverPush('driver-a');
    token('device-a'); await tick();
    await push.registerCurrentDeviceForDriverPush('driver-a');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[1]).toEqual(['register_driver_push_token', { p_token: 'device-a', p_platform: 'ios' }]);
  });

  it('keeps an offline token and coalesces concurrent retries when the network returns', async () => {
    const push = await import('./push-notifications');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    mocks.online = false;
    token('device-a'); await tick();
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.online = true;
    const write = deferred<{ error: null }>();
    mocks.rpc.mockReturnValueOnce(write.promise);
    const retry1 = push.registerCurrentDeviceForDriverPush('driver-a');
    const retry2 = push.registerCurrentDeviceForDriverPush('driver-a');
    await tick();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    write.resolve({ error: null });
    await Promise.all([retry1, retry2]);
  });

  it('persists a rotated token after an earlier token write completes', async () => {
    const push = await import('./push-notifications');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    const write = deferred<{ error: null }>();
    mocks.rpc.mockReturnValueOnce(write.promise);
    token('old-device-token'); token('new-device-token');
    write.resolve({ error: null }); await tick();
    expect(mocks.rpc.mock.calls.map(call => call[1].p_token)).toEqual(['old-device-token', 'new-device-token']);
  });

  it('waits for an outstanding write before deleting only this device on logout', async () => {
    const push = await import('./push-notifications');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    const write = deferred<{ error: null }>();
    mocks.rpc.mockReturnValueOnce(write.promise);
    token('device-a');
    const logout = push.removeCurrentDevicePushToken('driver-a');
    await tick(); expect(mocks.deletes).toHaveLength(0);
    write.resolve({ error: null }); await logout;
    expect(mocks.deletes).toEqual([[['user_id', 'driver-a'], ['token', 'device-a']]]);
    expect(mocks.unregister).toHaveBeenCalledTimes(1);
    expect(mocks.callbacks.every(item => item.remove.mock.calls.length === 1)).toBe(true);
  });

  it('keeps logout suspended across cleanup and late retries until a new auth lifecycle explicitly starts', async () => {
    const push = await import('./push-notifications');
    await push.startCurrentDeviceForDriverPush('driver-a');
    const write = deferred<{ error: null }>();
    mocks.rpc.mockReturnValueOnce(write.promise);
    token('device-a');
    const logout = push.removeCurrentDevicePushToken('driver-a');
    // AuthProvider still exposes driver-a until its awaited push cleanup finishes.
    const duringCleanup = push.registerCurrentDeviceForDriverPush('driver-a');
    await tick();
    write.resolve({ error: null });
    await Promise.all([logout, duringCleanup]);
    // A resume can also occur after cleanup but before Supabase signOut completes.
    await push.registerCurrentDeviceForDriverPush('driver-a');
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
    expect(mocks.unregister).toHaveBeenCalledTimes(1);
    await push.startCurrentDeviceForDriverPush('driver-a');
    expect(mocks.register).toHaveBeenCalledTimes(2);
  });

  it('supports immediate StrictMode start-cleanup-start without deadlock or reviving the old session', async () => {
    const push = await import('./push-notifications');
    const firstStart = push.startCurrentDeviceForDriverPush('driver-a');
    const firstCleanup = push.removeCurrentDevicePushToken('driver-a');
    const secondStart = push.startCurrentDeviceForDriverPush('driver-a');
    await Promise.all([firstStart, firstCleanup, secondStart]);
    token('active-device'); await tick();
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.unregister).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0]).toEqual(['register_driver_push_token', { p_token: 'active-device', p_platform: 'ios' }]);
  });

  it('does not delete another device when no local token has arrived', async () => {
    const push = await import('./push-notifications');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    await push.removeCurrentDevicePushToken('driver-a');
    expect(mocks.deletes).toHaveLength(0);
    expect(mocks.unregister).toHaveBeenCalledTimes(1);
  });

  it('ignores stale callbacks after account changes', async () => {
    const push = await import('./push-notifications');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    const oldCallback = mocks.callbacks[0].callback;
    await push.registerCurrentDeviceForDriverPush('driver-b');
    oldCallback({ value: 'stale-token' });
    token('device-b'); await tick();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0]).toEqual(['register_driver_push_token', { p_token: 'device-b', p_platform: 'ios' }]);
    await push.removeCurrentDevicePushToken('driver-a');
    expect(mocks.unregister).toHaveBeenCalledTimes(1);
  });

  it('does not register after logout while permission is still pending', async () => {
    const push = await import('./push-notifications');
    const permission = deferred<{ receive: string }>();
    mocks.permissions.mockReturnValueOnce(permission.promise);
    const start = push.registerCurrentDeviceForDriverPush('driver-a');
    await tick();
    const logout = push.removeCurrentDevicePushToken('driver-a');
    permission.resolve({ receive: 'granted' });
    await Promise.all([start, logout]);
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.callbacks).toHaveLength(0);
  });

  it('can register when permission is enabled later in system settings', async () => {
    const push = await import('./push-notifications');
    mocks.permissions.mockResolvedValueOnce({ receive: 'denied' });
    await push.registerCurrentDeviceForDriverPush('driver-a');
    expect(mocks.register).not.toHaveBeenCalled();
    await push.registerCurrentDeviceForDriverPush('driver-a');
    expect(mocks.checkPermissions).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });

  it('allows a fresh attempt after native registration fails', async () => {
    const push = await import('./push-notifications');
    mocks.register.mockRejectedValueOnce(new Error('OS unavailable'));
    await expect(push.registerCurrentDeviceForDriverPush('driver-a')).rejects.toThrow('OS unavailable');
    await push.registerCurrentDeviceForDriverPush('driver-a');
    token('device-a'); await tick();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.callbacks.slice(0, 2).every(item => item.remove.mock.calls.length === 1)).toBe(true);
  });
});
