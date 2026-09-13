import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the actual module location: Bun hoists it to the workspace root.
const modulePath = dirname(fileURLToPath(import.meta.resolve('better-sqlite3/package.json')));
const electronVersion = (await import('electron/package.json')).version;
const result = Bun.spawnSync(['bun', 'run', 'electron-rebuild', '-v', electronVersion, '-m', modulePath], { stdout: 'inherit', stderr: 'inherit' });
process.exit(result.exitCode);
