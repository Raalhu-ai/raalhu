import { parentPort, workerData } from 'node:worker_threads';
import { DesktopDatabase } from './database';
import { storageMethods } from './types';

const database = new DesktopDatabase(workerData.filename);
const allowed = new Set<string>([...storageMethods, 'close', 'backup', 'getByokPreferences', 'saveByokPreferences']);
// Sequential processing also orders backups and shutdown after pending writes.
let queue = Promise.resolve();
parentPort!.on('message', ({ requestId, method, args }) => {
  queue = queue.then(async () => {
    try {
      if (!allowed.has(method) || !Array.isArray(args)) throw new Error('Invalid storage operation');
      const result = await (database as any)[method](...args);
      parentPort!.postMessage({ requestId, result });
    } catch (error) {
      parentPort!.postMessage({ requestId, error: error instanceof Error ? error.message : 'Storage operation failed' });
    }
  });
});
