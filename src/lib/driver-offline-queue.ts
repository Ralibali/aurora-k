import { supabase } from '@/integrations/supabase/client';

export type DriverOfflineOperation = {
  id: string;
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
let flushPromise: Promise<{ synced: number; remaining: number }> | null = null;

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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offlinekön kunde inte uppdateras'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('Offlinekön misslyckades'));
  });
}

function changed() {
  window.dispatchEvent(new CustomEvent('aurora-offline-queue-change'));
}

export async function enqueueDriverOperation(input: Omit<DriverOfflineOperation, 'id' | 'createdAt' | 'attempts' | 'nextAttemptAt'>) {
  const operation: DriverOfflineOperation = {
    ...input,
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
  const rows = await runStore<DriverOfflineOperation[]>('readonly', store => store.getAll());
  return rows.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

export async function driverOfflineQueueCount() {
  return runStore<number>('readonly', store => store.count());
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

async function sendOperation(operation: DriverOfflineOperation) {
  const body = new FormData();
  body.append('idempotencyKey', operation.id);
  body.append('assignmentId', operation.assignmentId);
  body.append('operationType', operation.operationType);
  body.append('metadata', JSON.stringify(operation.metadata));
  if (operation.photo) body.append('photo', new File([operation.photo], 'delivery-photo.jpg', { type: operation.photo.type || 'image/jpeg' }));
  if (operation.signature) body.append('signature', new File([operation.signature], 'signature.png', { type: operation.signature.type || 'image/png' }));
  const { data, error } = await supabase.functions.invoke('driver-sync', { body });
  if (error) throw error;
  const response = data as { synced?: boolean; result?: Record<string, unknown>; error?: string } | null;
  if (!response?.synced) throw new Error(response?.error || 'Servern bekräftade inte synkningen');
  return response.result ?? {};
}

export function flushDriverOfflineQueue() {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    if (!navigator.onLine) return { synced: 0, remaining: await driverOfflineQueueCount() };
    let synced = 0;
    const operations = await listDriverOperations();
    for (const operation of operations) {
      if (operation.nextAttemptAt > Date.now()) continue;
      try {
        await sendOperation(operation);
        await removeOperation(operation.id);
        synced += 1;
      } catch (error) {
        const attempts = operation.attempts + 1;
        await updateOperation({
          ...operation,
          attempts,
          nextAttemptAt: Date.now() + retryDelay(attempts),
          lastError: error instanceof Error ? error.message : 'Synkningen misslyckades',
        });
        if (!navigator.onLine) break;
      }
    }
    return { synced, remaining: await driverOfflineQueueCount() };
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

export async function syncOrQueueDriverOperation(input: Omit<DriverOfflineOperation, 'id' | 'createdAt' | 'attempts' | 'nextAttemptAt'>) {
  const operation = await enqueueDriverOperation(input);
  if (!navigator.onLine) return { queued: true, operationId: operation.id, result: null };
  await flushDriverOfflineQueue();
  const remaining = await listDriverOperations();
  const queued = remaining.some(item => item.id === operation.id);
  return { queued, operationId: operation.id, result: queued ? null : { synced: true } };
}
