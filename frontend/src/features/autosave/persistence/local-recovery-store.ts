/**
 * @file Autosave feature: local recovery store. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const databaseName = 'forgestudio-recovery-v1';
const accountLimit = 50 * 1024 * 1024;
interface RecordEntry { key: string; accountId: string; websiteId: string; data: string; bytes: number; updatedAt: number }
/**
 * Open.
 */
async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('drafts', { keyPath: 'key' });
      store.createIndex('accountId', 'accountId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
/**
 * Write Recovery.
 * @param accountId Account Id supplied to this operation (type: string).
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param tabId Tab Id supplied to this operation (type: string).
 * @param kind Kind supplied to this operation (type: 'local' | 'mutation').
 * @param data Data supplied to this operation (type: string).
 */
export async function writeRecovery(accountId: string, websiteId: string, tabId: string, kind: 'local' | 'mutation', data: string) {
  const bytes = new TextEncoder().encode(data).byteLength;
  if (bytes > 3 * 1024 * 1024) throw new Error('Local recovery document exceeds 3 MiB. Export your changes.');
  const database = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      const store = transaction.objectStore('drafts');
      const key = JSON.stringify([accountId, websiteId, tabId, kind]);
      const request = store.index('accountId').getAll(accountId);
      request.onsuccess = () => {
        const records = request.result as RecordEntry[];
        const total = records.reduce((sum, record) => sum + (record.key === key ? 0 : record.bytes), bytes);
        if (total > accountLimit) { transaction.abort(); return; }
        store.put({ key, accountId, websiteId, data, bytes, updatedAt: Date.now() } satisfies RecordEntry);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error('Local recovery quota is full. Export your changes before clearing recovery copies.'));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
/**
 * List Recovery.
 * @param accountId Account Id supplied to this operation (type: string).
 * @param websiteId Identifier of the website whose data is being read or changed.
 */
export async function listRecovery(accountId: string, websiteId: string): Promise<RecordEntry[]> {
  const database = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction('drafts').objectStore('drafts').index('accountId').getAll(accountId);
      request.onsuccess = () => resolve((request.result as RecordEntry[]).filter(record => record.websiteId === websiteId));
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
}
/**
 * Clear Account Recovery.
 * @param accountId Account Id supplied to this operation (type: string).
 */
export async function clearAccountRecovery(accountId: string) {
  const database = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      const store = transaction.objectStore('drafts');
      const cursor = store.index('accountId').openCursor(accountId);
      cursor.onsuccess = () => { const row = cursor.result; if (row) { row.delete(); row.continue(); } };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
