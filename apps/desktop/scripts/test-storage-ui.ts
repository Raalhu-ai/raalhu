import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const profile = await mkdtemp(path.join(tmpdir(), 'raalhu-storage-ui-'));
const outfile = path.resolve('dist/main/storage-ui.smoke.cjs');
let code = 1;
try {
  const build = await Bun.build({ entrypoints: ['./test/storage-ui.smoke.ts'], outdir: path.dirname(outfile), naming: 'storage-ui.smoke.cjs', target: 'node', format: 'cjs', define: { __dirname: JSON.stringify(path.dirname(outfile)) }, external: ['electron', 'better-sqlite3'] });
  if (!build.success) throw new Error(build.logs.join('\n'));
  const electron = (await import('electron')).default as unknown as string;
  const env = { ...process.env, RAALHU_STORAGE_TEST_DIR: profile };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = Bun.spawn([electron, outfile], { env, stdout: 'inherit', stderr: 'inherit' });
  const timeout = setTimeout(() => child.kill(), 30000);
  code = await child.exited;
  clearTimeout(timeout);
} finally {
  await rm(outfile, { force: true });
  await rm(profile, { recursive: true, force: true });
}
process.exit(code);
