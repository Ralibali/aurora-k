import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  native: true,
  getStatus: vi.fn(),
  networkListener: undefined as undefined | ((status: { connected: boolean }) => void),
  appListener: undefined as undefined | ((state: { isActive: boolean }) => void),
  removeNetwork: vi.fn(),
  removeApp: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native } }));
vi.mock('@capacitor/network', () => ({ Network: {
  getStatus: mocks.getStatus,
  addListener: async (_event: string, listener: typeof mocks.networkListener) => {
    mocks.networkListener = listener;
    return { remove: mocks.removeNetwork };
  },
} }));
vi.mock('@capacitor/app', () => ({ App: {
  addListener: async (_event: string, listener: typeof mocks.appListener) => {
    mocks.appListener = listener;
    return { remove: mocks.removeApp };
  },
} }));

const browserStatus = (online: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
let cleanup: Array<() => void>;
async function start() {
  const connectivity = await import('./app-connectivity');
  cleanup.push(connectivity.initializeAppConnectivity());
  return connectivity;
}
async function observeAssignments() {
  const { QueryClient, QueryObserver } = await import('@tanstack/query-core');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.mount();
  const fetchAssignments = vi.fn().mockResolvedValue([{ id: 'synthetic-1' }, { id: 'synthetic-2' }, { id: 'synthetic-3' }]);
  const observer = new QueryObserver(client, { queryKey: ['assignments', 'driver', 'synthetic-driver'], queryFn: fetchAssignments });
  const unsubscribe = observer.subscribe(() => {});
  cleanup.push(() => { unsubscribe(); client.unmount(); client.clear(); });
  return { observer, fetchAssignments };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  cleanup = [];
  mocks.native = true;
  mocks.networkListener = undefined;
  mocks.appListener = undefined;
  mocks.getStatus.mockReset().mockResolvedValue({ connected: true });
  mocks.removeNetwork.mockResolvedValue(undefined);
  mocks.removeApp.mockResolvedValue(undefined);
  browserStatus(true);
});
afterEach(() => {
  for (const stop of cleanup.reverse()) stop();
  vi.restoreAllMocks();
});

describe('shared app connectivity', () => {
  it('initializes native queries from the native connection despite false WebView offline signals', async () => {
    browserStatus(false);
    const connectivity = await start();
    await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(1));
    const { observer, fetchAssignments } = await observeAssignments();
    window.dispatchEvent(new Event('offline'));
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toHaveLength(3));
    expect(connectivity.isAppOnline()).toBe(true);
    expect(fetchAssignments).toHaveBeenCalledTimes(1);
  });

  it('pauses a genuinely offline initial query and resumes it on native reconnection', async () => {
    mocks.getStatus.mockResolvedValue({ connected: false });
    const connectivity = await start();
    await vi.waitFor(() => expect(connectivity.isAppOnline()).toBe(false));
    const { observer, fetchAssignments } = await observeAssignments();
    expect(observer.getCurrentResult()).toMatchObject({ status: 'pending', fetchStatus: 'paused', isLoading: false });
    expect(fetchAssignments).not.toHaveBeenCalled();
    const changes = vi.fn();
    cleanup.push(connectivity.subscribeAppConnectivity(changes));
    mocks.networkListener?.({ connected: true });
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toHaveLength(3));
    expect(fetchAssignments).toHaveBeenCalledTimes(1);
    expect(changes).toHaveBeenLastCalledWith(true);
  });

  it('refreshes native state on app resume when a background transition was missed', async () => {
    mocks.getStatus.mockResolvedValueOnce({ connected: false }).mockResolvedValue({ connected: true });
    const connectivity = await start();
    await vi.waitFor(() => expect(connectivity.isAppOnline()).toBe(false));
    const { observer, fetchAssignments } = await observeAssignments();
    mocks.appListener?.({ isActive: false });
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    mocks.appListener?.({ isActive: true });
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toHaveLength(3));
    expect(mocks.getStatus).toHaveBeenCalledTimes(2);
    expect(fetchAssignments).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a new connection event with stale initial status', async () => {
    let finish!: (status: { connected: boolean }) => void;
    mocks.getStatus.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const connectivity = await start();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    mocks.networkListener?.({ connected: true });
    finish({ connected: false });
    await Promise.resolve();
    expect(connectivity.isAppOnline()).toBe(true);
    const { observer } = await observeAssignments();
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toHaveLength(3));
  });

  it('uses browser status and online events for web initialization and recovery', async () => {
    mocks.native = false;
    browserStatus(false);
    const connectivity = await start();
    const { observer, fetchAssignments } = await observeAssignments();
    expect(observer.getCurrentResult().fetchStatus).toBe('paused');
    expect(fetchAssignments).not.toHaveBeenCalled();
    browserStatus(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toHaveLength(3));
    expect(connectivity.isAppOnline()).toBe(true);
    browserStatus(false);
    window.dispatchEvent(new Event('offline'));
    expect(connectivity.isAppOnline()).toBe(false);
    expect(mocks.getStatus).not.toHaveBeenCalled();
    expect(mocks.networkListener).toBeUndefined();
  });

  it('allows actual requests if native status fails instead of trusting the WebView false hint', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    browserStatus(false);
    mocks.getStatus.mockRejectedValue(new Error('Bridge temporarily unavailable'));
    const connectivity = await start();
    await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(1));
    const { observer } = await observeAssignments();
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toHaveLength(3));
    expect(connectivity.isAppOnline()).toBe(true);
  });

  it('removes native listeners even if stopped before registration completes', async () => {
    const connectivity = await import('./app-connectivity');
    const stop = connectivity.initializeAppConnectivity();
    stop();
    await vi.waitFor(() => expect(mocks.removeNetwork).toHaveBeenCalledTimes(1));
    expect(mocks.removeApp).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });
});
