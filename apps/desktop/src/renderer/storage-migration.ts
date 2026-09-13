import { fileBase64, storage } from './storage';
import type { MigrationStatus, Project } from '../storage/types';

function openLegacy(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mogger-db');
    let absent = false;
    request.onupgradeneeded = () => { absent = true; request.transaction!.abort(); };
    request.onerror = () => absent ? resolve(null) : reject(request.error);
    request.onblocked = () => reject(new Error('Close other desktop windows before migrating history.'));
    request.onsuccess = () => resolve(request.result);
  });
}
function batch(db: IDBDatabase, store: string, after?: IDBValidKey): Promise<any[]> {
  if (!db.objectStoreNames.contains(store)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).getAll(after === undefined ? undefined : IDBKeyRange.lowerBound(after, true), 20);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Legacy history read interrupted'));
  });
}

export async function initializeStorage(onProgress: (text: string) => void): Promise<MigrationStatus> {
  const api = storage();
  const status = await api.migrationStatus();
  // Recovery indicators remain on the affected project files after this first-run report.
  if (status.complete) return { ...status, warnings: [] };
  const legacy = await openLegacy();
  const counts = { sessions: 0, projects: 0 };
  const warnings: string[] = [];
  try {
    if (legacy) for (const table of ['projects', 'sessions'] as const) {
      let after: IDBValidKey | undefined;
      while (true) {
        const records = await batch(legacy, table, after);
        if (!records.length) break;
        for (const record of records) {
          onProgress(`Moving ${table}: ${counts[table] + 1}`);
          if (table === 'sessions') {
            await api.importRecord({ kind: 'session', record });
          } else {
            const files: Record<string, string> = {};
            const project: Project = { ...record, files: [] };
            for (const source of record.files || []) {
              const { handle, ...metadata } = source;
              try {
                const file = await handle.getFile();
                files[source.id] = await fileBase64(file);
                project.files.push({ ...metadata, size: file.size, missing: false });
              } catch {
                project.files.push({ ...metadata, missing: true });
                warnings.push(`${record.name}: ${source.name} could not be copied. Add the file again from Projects.`);
              }
            }
            await api.importRecord({ kind: 'project', record: project, files });
          }
          counts[table]++;
          after = record.id;
        }
      }
    }
    await api.finishMigration(counts, warnings);
    return await api.migrationStatus();
  } finally { legacy?.close(); }
}
