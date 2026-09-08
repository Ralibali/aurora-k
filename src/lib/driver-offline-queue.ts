import { supabase } from '@/integrations/supabase/client';

export type DriverOfflineOperation = {
  id: string;
  userId?: string;
  rejected?: boolean;
  operationType: 'delivery_proof' | 'assignment_status';
  assignmentId: string;
  metadata: Record<string, unknown>;
  photo?: Blob | null;
  signature?: Blob | null;
  createdAt: string;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string | null;
};

const DB_NAME = 'aurora-driver-offline';
const STORE = 'operations';
const VERSION = 1;
type FlushReport = { synced: number; remaining: number; results: Record<string, Record<string, unknown>>; rejected: Record<string, string> };
let flushPromise: Promise<FlushReport> | null = null;

async function currentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('nextAttemptAt', 'nextAttemptAt');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offlinekön kunde inte öppnas'));
  });
}

async function runStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error('Offlinekön kunde inte uppdateras'));
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Offlinekön kunde inte sparas')); };
    transaction.onerror = () => reject(transaction.error ?? new Error('Offlinekön misslyckades'));
  });
}

function changed() {
  window.dispatchEvent(new CustomEvent('aurora-offline-queue-change'));
}

export async function enqueueDriverOperation(input: Omit<DriverOfflineOperation, 'id' | 'createdAt' | 'attempts' | 'nextAttemptAt'>) {
  const session = await currentSession();
  if (!session?.user.id) throw new Error('Logga in innan du sparar en ändring.');
  const operation: DriverOfflineOperation = {
    ...input,
    userId: session.user.id,
    rejected: false,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
  };
  await runStore('readwrite', store => store.put(operation));
  changed();
  return operation;
}

export async function listDriverOperations() {
  const session = await currentSession();
  if (!session?.user.id) return [];
  const rows = await runStore<DriverOfflineOperation[]>('readonly', store => store.getAll());
  return rows.filter(row => row.userId === session.user.id).sort((first, second) => first.createdAt.localeCompare(second.createdAt) || Number(first.operationType === 'delivery_proof') - Number(second.operationType === 'delivery_proof'));
}

export async function driverOfflineQueueCount() {
  return (await listDriverOperations()).length;
}

export async function legacyDriverOperationCount() {
  const rows = await runStore<DriverOfflineOperation[]>('readonly', store => store.getAll());
  return rows.filter(row => !row.userId).length;
}

export async function discardRejectedDriverOperation(id: string) {
  const operation = (await listDriverOperations()).find(row => row.id === id);
  if (!operation?.rejected) throw new Error('Ändringen kan inte tas bort medan den väntar på synk.');
  await removeOperation(id);
}

async function removeOperation(id: string) {
  await runStore('readwrite', store => store.delete(id));
  changed();
}

async function updateOperation(operation: DriverOfflineOperation) {
  await runStore('readwrite', store => store.put(operation));
  changed();
}

function retryDelay(attempts: number) {
  const seconds = Math.min(15 * 60, 5 * 2 ** Math.min(attempts, 8));
  return seconds * 1000 + Math.floor(Math.random() * 1500);
}

class DriverSyncError extends Error {
  constructor(message: string, readonly permanent = false) { super(message); }
}

async function sendOperation(operation: DriverOfflineOperation) {
  const session = await currentSession();
  if (!session || operation.userId !== session.user.id) throw new DriverSyncError('Logga in med föraren som sparade ändringen.');
  const body = new FormData();
  body.append('idempotencyKey', operation.id);
  body.append('assignmentId', operation.assignmentId);
  body.append('operationType', operation.operationType);
  body.append('metadata', JSON.stringify(operation.metadata));
  if (operation.photo) body.append('photo', new File([operation.photo], 'delivery-photo.jpg', { type: operation.photo.type || 'image/jpeg' }));
  if (operation.signature) body.append('signature', new File([operation.signature], 'signature.png', { type: operation.signature.type || 'image/png' }));
  const { data, error } = await supabase.functions.invoke('driver-sync', { body, headers: { Authorization: `Bearer ${session.access_token}` } });
  if (error) {
    const response = 'context' in error && error.context instanceof Response ? error.context : null;
    const details = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null;
    throw new DriverSyncError(details?.error || error.message, Boolean(response && [400, 403, 404, 409, 422].includes(response.status)));
  }
  const response = data as { synced?: boolean; result?: Record<string, unknown>; error?: string } | null;
  if (!response?.synced) throw new DriverSyncError(response?.error || 'Servern bekräftade inte synkningen');
  return response.result ?? {};
}

export function flushDriverOfflineQueue() {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const report: FlushReport = { synced: 0, remaining: 0, results: {}, rejected: {} };
    const operations = await listDriverOperations();
    const blockedAssignments = new Set<string>();
    if (navigator.onLine) for (const operation of operations) {
      if (blockedAssignments.has(operation.assignmentId)) continue;
      if (operation.rejected || operation.nextAttemptAt > Date.now()) {
        blockedAssignments.add(operation.assignmentId);
        continue;
      }
      try {
        report.results[operation.id] = await sendOperation(operation);
        await removeOperation(operation.id);
        report.synced += 1;
      } catch (error) {
        const attempts = operation.attempts + 1;
        const permanent = error instanceof DriverSyncError && error.permanent;
        const message = error instanceof Error ? error.message : 'Synkningen misslyckades';
        if (permanent) report.rejected[operation.id] = message;
        await updateOperation({ ...operation, attempts, rejected: permanent, nextAttemptAt: Date.now() + retryDelay(attempts), lastError: message });
        blockedAssignments.add(operation.assignmentId);
        if (!navigator.onLine) break;
      }
    }
    report.remaining = await driverOfflineQueueCount();
    return report;
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

export async function syncOrQueueDriverOperation(input: Omit<DriverOfflineOperation, 'id' | 'createdAt' | 'attempts' | 'nextAttemptAt'>) {
  const operation = await enqueueDriverOperation(input);
  if (!navigator.onLine) return { queued: true, operationId: operation.id, result: null };
  // Use one sender for both immediate and background work. A later completion
  // must never overtake its queued start or duplicate an in-flight request.
  const running = flushPromise;
  if (running) {
    const prior = await running;
    if (prior.rejected[operation.id]) throw new DriverSyncError(prior.rejected[operation.id], true);
    if (prior.results[operation.id]) return { queued: false, operationId: operation.id, result: prior.results[operation.id] };
  }
  const report = await flushDriverOfflineQueue();
  if (report.rejected[operation.id]) throw new DriverSyncError(report.rejected[operation.id], true);
  if (report.results[operation.id]) return { queued: false, operationId: operation.id, result: report.results[operation.id] };
  const stillPending = (await listDriverOperations()).some(row => row.id === operation.id);
  return { queued: stillPending, operationId: operation.id, result: null };
}
