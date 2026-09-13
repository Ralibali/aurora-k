import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { DriverPushNotifications } from './DriverPushNotifications';

type AppCallback = (state: { isActive: boolean }) => void;
type PushCallback = (event: { notification: { data?: Record<string, string> } }) => void;
const mocks = vi.hoisted(() => ({
  native: true,
  auth: { userId: 'driver-a' as string | null, role: 'driver' as 'driver' | 'admin' | null },
  start: vi.fn(), retry: vi.fn(), removeDevice: vi.fn(), navigate: vi.fn(), appListener: vi.fn(), pushListener: vi.fn(),
  connectivity: [] as Array<{ callback: (online: boolean) => void; unsubscribe: ReturnType<typeof vi.fn> }>,
  appCallbacks: [] as AppCallback[], pushCallbacks: [] as PushCallback[],
  removeApp: vi.fn(), removePush: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  user: mocks.auth.userId ? { id: mocks.auth.userId } : null, role: mocks.auth.role,
}) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/lib/push-notifications', () => ({
  isNativePushAvailable: () => mocks.native,
  startCurrentDeviceForDriverPush: mocks.start,
  registerCurrentDeviceForDriverPush: mocks.retry,
  removeCurrentDevicePushToken: mocks.removeDevice,
}));
vi.mock('@/lib/app-connectivity', () => ({ subscribeAppConnectivity: (callback: (online: boolean) => void) => {
  const unsubscribe = vi.fn();
  mocks.connectivity.push({ callback, unsubscribe });
  return unsubscribe;
} }));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.appListener } }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { addListener: mocks.pushListener } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const settled = async () => { await act(async () => { await Promise.resolve(); }); };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.native = true;
  mocks.auth = { userId: 'driver-a', role: 'driver' };
  mocks.connectivity.length = 0; mocks.appCallbacks.length = 0; mocks.pushCallbacks.length = 0;
  mocks.start.mockReset().mockResolvedValue(undefined);
  mocks.retry.mockReset().mockResolvedValue(undefined);
  mocks.removeDevice.mockReset().mockResolvedValue(undefined);
  mocks.removeApp.mockReset().mockResolvedValue(undefined);
  mocks.removePush.mockReset().mockResolvedValue(undefined);
  mocks.appListener.mockReset().mockImplementation(async (event: string, callback: AppCallback) => {
    expect(event).toBe('appStateChange');
    mocks.appCallbacks.push(callback);
    return { remove: mocks.removeApp };
  });
  mocks.pushListener.mockReset().mockImplementation(async (event: string, callback: PushCallback) => {
    expect(event).toBe('pushNotificationActionPerformed');
    mocks.pushCallbacks.push(callback);
    return { remove: mocks.removePush };
  });
});
afterEach(cleanup);

describe('DriverPushNotifications lifecycle wiring', () => {
  it('starts once per authenticated driver and uses retry for online, native resume and visible transitions', async () => {
    render(<DriverPushNotifications />);
    await settled();
    expect(mocks.start).toHaveBeenCalledExactlyOnceWith('driver-a');
    expect(mocks.retry).not.toHaveBeenCalled();
    act(() => { mocks.connectivity[0].callback(false); mocks.appCallbacks[0]({ isActive: false }); });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.retry).not.toHaveBeenCalled();
    act(() => { mocks.connectivity[0].callback(true); mocks.appCallbacks[0]({ isActive: true }); });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.retry.mock.calls).toEqual([['driver-a'], ['driver-a'], ['driver-a']]);
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });

  it('does not restart the lifecycle on an ordinary rerender or retry failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.retry.mockRejectedValueOnce(new Error('Temporary failure'));
    const view = render(<DriverPushNotifications />);
    await settled();
    view.rerender(<DriverPushNotifications />);
    act(() => { mocks.connectivity[0].callback(true); });
    await settled();
    act(() => { mocks.appCallbacks[0]({ isActive: true }); });
    await settled();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.retry).toHaveBeenCalledTimes(2);
    expect(mocks.connectivity).toHaveLength(1);
  });

  it('detaches old account retries and starts only the new account while an old start is in flight', async () => {
    const oldStart = deferred<void>();
    mocks.start.mockReturnValueOnce(oldStart.promise);
    const view = render(<DriverPushNotifications />);
    await settled();
    const oldConnectivity = mocks.connectivity[0];
    const oldResume = mocks.appCallbacks[0];
    mocks.auth.userId = 'driver-b';
    view.rerender(<DriverPushNotifications />);
    await settled();
    expect(oldConnectivity.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.removeDevice).toHaveBeenCalledExactlyOnceWith('driver-a');
    expect(mocks.removeApp).toHaveBeenCalledTimes(1);
    act(() => { oldConnectivity.callback(true); oldResume({ isActive: true }); });
    expect(mocks.retry).not.toHaveBeenCalled();
    act(() => { mocks.connectivity[1].callback(true); mocks.appCallbacks[1]({ isActive: true }); });
    await act(async () => { oldStart.resolve(); await oldStart.promise; });
    expect(mocks.start.mock.calls).toEqual([['driver-a'], ['driver-b']]);
    expect(mocks.retry.mock.calls).toEqual([['driver-b'], ['driver-b']]);
  });

  it('stops retries on logout and creates a new lifecycle for the same account only after login', async () => {
    const view = render(<DriverPushNotifications />);
    await settled();
    const oldConnectivity = mocks.connectivity[0];
    const oldResume = mocks.appCallbacks[0];
    mocks.auth.userId = null; mocks.auth.role = null;
    view.rerender(<DriverPushNotifications />);
    await settled();
    act(() => { oldConnectivity.callback(true); oldResume({ isActive: true }); });
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.retry).not.toHaveBeenCalled();
    expect(oldConnectivity.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.removeDevice).toHaveBeenCalledExactlyOnceWith('driver-a');
    mocks.auth.userId = 'driver-a'; mocks.auth.role = 'driver';
    view.rerender(<DriverPushNotifications />);
    await settled();
    expect(mocks.start.mock.calls).toEqual([['driver-a'], ['driver-a']]);
    expect(mocks.connectivity).toHaveLength(2);
  });

  it.each(['web', 'logged-out', 'admin'] as const)('does not start registration or retry listeners for %s', async mode => {
    if (mode === 'web') mocks.native = false;
    if (mode === 'logged-out') mocks.auth.userId = null;
    if (mode === 'admin') mocks.auth.role = 'admin';
    render(<DriverPushNotifications />);
    await settled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.retry).not.toHaveBeenCalled();
    expect(mocks.connectivity).toHaveLength(0);
    expect(mocks.appListener).not.toHaveBeenCalled();
  });

  it('removes resolved listeners and ignores old registration callbacks after unmount', async () => {
    const view = render(<DriverPushNotifications />);
    await settled();
    view.unmount();
    await settled();
    expect(mocks.connectivity[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.removeApp).toHaveBeenCalledTimes(1);
    expect(mocks.removePush).toHaveBeenCalledTimes(1);
    expect(mocks.removeDevice).toHaveBeenCalledExactlyOnceWith('driver-a');
    act(() => { mocks.connectivity[0].callback(true); mocks.appCallbacks[0]({ isActive: true }); });
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.retry).not.toHaveBeenCalled();
  });

  it('removes listener handles that resolve only after unmount', async () => {
    const appHandle = deferred<{ remove: typeof mocks.removeApp }>();
    const pushHandle = deferred<{ remove: typeof mocks.removePush }>();
    mocks.appListener.mockReturnValueOnce(appHandle.promise);
    mocks.pushListener.mockReturnValueOnce(pushHandle.promise);
    const view = render(<DriverPushNotifications />);
    view.unmount();
    await act(async () => {
      appHandle.resolve({ remove: mocks.removeApp });
      pushHandle.resolve({ remove: mocks.removePush });
      await Promise.all([appHandle.promise, pushHandle.promise]);
    });
    expect(mocks.removeApp).toHaveBeenCalledTimes(1);
    expect(mocks.removePush).toHaveBeenCalledTimes(1);
    expect(mocks.connectivity[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('routes notification taps through either supported assignment identifier', async () => {
    render(<DriverPushNotifications />);
    await settled();
    act(() => {
      mocks.pushCallbacks[0]({ notification: { data: { assignmentId: 'job-one' } } });
      mocks.pushCallbacks[0]({ notification: { data: { assignment_id: 'job-two' } } });
      mocks.pushCallbacks[0]({ notification: { data: {} } });
    });
    expect(mocks.navigate.mock.calls).toEqual([['/driver/assignments/job-one'], ['/driver/assignments/job-two']]);
  });

  it('pairs StrictMode cleanup with a fresh lifecycle and leaves only the new retry listeners active', async () => {
    const view = render(<StrictMode><DriverPushNotifications /></StrictMode>);
    await settled();
    expect(mocks.start.mock.calls).toEqual([['driver-a'], ['driver-a']]);
    expect(mocks.removeDevice).toHaveBeenCalledExactlyOnceWith('driver-a');
    expect(mocks.connectivity[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.connectivity[1].unsubscribe).not.toHaveBeenCalled();
    act(() => { mocks.connectivity[0].callback(true); mocks.appCallbacks[0]({ isActive: true }); });
    expect(mocks.retry).not.toHaveBeenCalled();
    act(() => { mocks.connectivity[1].callback(true); mocks.appCallbacks[1]({ isActive: true }); });
    expect(mocks.retry.mock.calls).toEqual([['driver-a'], ['driver-a']]);
    view.unmount();
    await settled();
    expect(mocks.removeDevice).toHaveBeenCalledTimes(2);
    expect(mocks.removeApp).toHaveBeenCalledTimes(2);
    expect(mocks.removePush).toHaveBeenCalledTimes(2);
  });
});
