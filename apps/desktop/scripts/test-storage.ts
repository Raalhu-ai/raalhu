import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve('dist/storage-tests');
await mkdir(directory, { recursive: true });
const result = await Bun.build({ entrypoints: ['./test/storage.test.ts'], outdir: directory, target: 'node', format: 'cjs', external: ['better-sqlite3'], naming: '[name].cjs' });
if (!result.success) throw new Error(result.logs.join('\n'));
// Test the real native driver under Electron's Node runtime, not Bun's SQLite implementation.
const electron = (await import('electron')).default as unknown as string;
const test = Bun.spawn([electron, path.join(directory, 'storage.test.cjs')], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdout: 'inherit', stderr: 'inherit',
});
const code = await test.exited;
await rm(directory, { recursive: true, force: true });
process.exit(code);
