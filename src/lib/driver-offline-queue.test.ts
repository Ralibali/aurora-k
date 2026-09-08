import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DriverOfflineOperation } from './driver-offline-queue';
const mocks = vi.hoisted(() => ({ session: { user: { id: 'driver-a' }, access_token: 'token-a' }, invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: mocks.session } }) }, functions: { invoke: mocks.invoke } } }));
import { enqueueDriverOperation, flushDriverOfflineQueue, listDriverOperations, syncOrQueueDriverOperation, discardRejectedDriverOperation } from './driver-offline-queue';

// Deliberately separate request success from transaction completion: a successful
// request followed by an aborted disk write must never be reported as durable.
let rows: Map<string, DriverOfflineOperation>;
let abortNextWrite: boolean;
function fakeDatabase() {
  const database = {
    close: vi.fn(),
    transaction(_store: string, mode: string) {
      const transaction = { oncomplete: null as null | (() => void), onabort: null as null | (() => void), error: new Error('Disk full'), objectStore: () => store };
      const request = <T>(value: T, commit: () => void = () => {}) => {
        const req = { result: value, onsuccess: null as null | (() => void) };
        queueMicrotask(() => {
          req.onsuccess?.();
          queueMicrotask(() => {
            if (mode === 'readwrite' && abortNextWrite) { abortNextWrite = false; transaction.onabort?.(); }
            else { commit(); transaction.oncomplete?.(); }
          });
        });
        return req;
      };
      const store = {
        getAll: () => request([...rows.values()].map(row => ({ ...row }))),
        put: (row: DriverOfflineOperation) => request(row.id, () => rows.set(row.id, { ...row })),
        delete: (id: string) => request(undefined, () => { rows.delete(id); }),
      };
      return transaction;
    },
  };
  return { open: () => {
    const req = { result: database, onsuccess: null as null | (() => void) };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  } };
}
const input = (assignmentId = 'assignment-a') => ({ assignmentId, operationType: 'assignment_status' as const, metadata: { status: 'active', changedAt: '2026-09-08T08:00:00Z' } });
const rejectedResponse = () => ({ data: null, error: { message: 'Rejected', context: new Response(JSON.stringify({ error: 'Uppdraget är avbokat' }), { status: 409 }) } });
beforeEach(() => {
  rows = new Map(); abortNextWrite = false;
  mocks.session = { user: { id: 'driver-a' }, access_token: 'token-a' };
  mocks.invoke.mockReset().mockResolvedValue({ data: { synced: true, result: { status: 'active' } }, error: null });
  vi.stubGlobal('indexedDB', fakeDatabase());
  let nextId = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}` });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
describe('durable driver offline queue', () => {
  it('waits for a committed write before declaring the operation saved', async () => {
    abortNextWrite = true;
    await expect(enqueueDriverOperation(input())).rejects.toThrow('Disk full');
    expect(rows.size).toBe(0);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('never replays another driver’s or unowned legacy work after account switching', async () => {
    const first = await enqueueDriverOperation(input());
    rows.set('legacy', { ...first, id: 'legacy', userId: undefined });
    mocks.session = { user: { id: 'driver-b' }, access_token: 'token-b' };
    expect(await listDriverOperations()).toEqual([]);
    await flushDriverOfflineQueue();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(rows.size).toBe(2);
  });
  it('shares one in-flight sender between background and immediate sync', async () => {
    await enqueueDriverOperation(input());
    let release!: () => void;
    mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve({ data: { synced: true, result: { status: 'active' } }, error: null }); }));
    const background = flushDriverOfflineQueue();
    while (!release) await Promise.resolve();
    const immediate = syncOrQueueDriverOperation(input('assignment-b'));
    release();
    await background;
    expect((await immediate).queued).toBe(false);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    const keys = mocks.invoke.mock.calls.map(call => (call[1].body as FormData).get('idempotencyKey'));
    expect(new Set(keys).size).toBe(2);
  });
  it('preserves start-before-proof ordering on retry while other assignments proceed', async () => {
    const start = await enqueueDriverOperation(input());
    rows.set(start.id, { ...start, nextAttemptAt: Date.now() + 60_000 });
    await enqueueDriverOperation({ assignmentId: 'assignment-a', operationType: 'delivery_proof', metadata: {} });
    await enqueueDriverOperation(input('assignment-b'));
    await flushDriverOfflineQueue();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect((mocks.invoke.mock.calls[0][1].body as FormData).get('assignmentId')).toBe('assignment-b');
    expect(rows.size).toBe(2);
  });
  it('retains permanent conflicts for review, blocks dependent proof, and never reports success', async () => {
    mocks.invoke.mockResolvedValue(rejectedResponse());
    await expect(syncOrQueueDriverOperation(input())).rejects.toThrow('Uppdraget är avbokat');
    const [rejected] = await listDriverOperations();
    expect(rejected.rejected).toBe(true);
    await enqueueDriverOperation({ assignmentId: 'assignment-a', operationType: 'delivery_proof', metadata: {} });
    await flushDriverOfflineQueue();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    await discardRejectedDriverOperation(rejected.id);
    expect((await listDriverOperations()).length).toBe(1);
  });
  it('keeps a temporary network failure queued', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('Network unavailable') });
    expect((await syncOrQueueDriverOperation(input())).queued).toBe(true);
    const [operation] = await listDriverOperations();
    expect(operation.rejected).toBe(false);
    expect(operation.attempts).toBe(1);
    await expect(discardRejectedDriverOperation(operation.id)).rejects.toThrow();
  });
});
