import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncQueueSchema extends DBSchema {
  mutationQueue: {
    key: number;
    value: {
      id?: number;
      actionName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
      createdAt: number;
    };
  };
}

const DB_NAME = 'pj-buddy-sync';
const STORE_NAME = 'mutationQueue';

async function getDB() {
  return openDB<SyncQueueSchema>(DB_NAME, 1, {
    upgrade(db: IDBPDatabase<SyncQueueSchema>) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

/**
 * Queue a server action to be executed when online.
 * @param actionName The name of the server action (e.g., 'updateJobStatus')
 * @param payload The arguments to pass to the action
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queueMutation(actionName: string, payload: any) {
  const db = await getDB();
  await db.add(STORE_NAME, {
    actionName,
    payload,
    createdAt: Date.now(),
  });
  if (process.env.NODE_ENV === 'development') console.log(`[SyncQueue] Queued action: ${actionName}`);
}

/**
 * Process the queue.
 * This should be called when the app comes back online.
 * Note: Since we can't import server actions directly into this client-side file without
 * causing build issues or circular deps, we'll need a mapping or a way to execute them.
 * For this implementation, we'll emit an event that the provider can listen to,
 * or we can pass a map of executors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processQueue(actionMap: Record<string, (payload: any) => Promise<any>>) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const items = await store.getAll();

  if (items.length === 0) return;

  if (process.env.NODE_ENV === 'development') console.log(`[SyncQueue] Processing ${items.length} offline mutations...`);

  for (const item of items) {
    const executor = actionMap[item.actionName];
    if (executor) {
      try {
        if (process.env.NODE_ENV === 'development') console.log(`[SyncQueue] Replaying: ${item.actionName}`);
        await executor(item.payload);
        // If successful, remove from queue
        if (item.id) await store.delete(item.id);
      } catch (error) {
        console.error(`[SyncQueue] Failed to replay ${item.actionName}:`, error);
        // Keep in queue to retry later? Or move to a 'failed' store?
        // For now, we leave it to retry next time.
      }
    } else {
      console.warn(`[SyncQueue] No executor found for action: ${item.actionName}`);
    }
  }

  await tx.done;
  if (process.env.NODE_ENV === 'development') console.log('[SyncQueue] Sync complete.');
}
