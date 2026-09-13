import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DesktopDatabase } from '../src/storage/database';
import type { Session, Project } from '../src/storage/types';
import { storageMethods } from '../src/storage/types';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { initializeStorage } from '../src/renderer/storage-migration';
import { saveAgentMessages, clearChats as clearRendererChats, flushDesktopStorage } from '../src/renderer/storage';
import { Worker } from 'node:worker_threads';

function session(id = 'session', patch: Partial<Session> = {}): Session {
  return { id, title: 'ޗެޓް', model: 'test-model', modeId: 'agent', messages: [{ id: 'user-1', role: 'user', content: 'ކިހިނެއް؟' }], body: { model: 'test-model' }, archived: 0, createdAt: 10, updatedAt: 20, ...patch };
}
function project(id = 'project'): Project {
  return { id, name: 'Research', instructions: 'Instructions', memory: 'Memory', files: [], archived: 0, createdAt: 10, updatedAt: 20 };
}
function setup(t: any, ready = true) {
  const directory = mkdtempSync(path.join(tmpdir(), 'raalhu-sqlite-'));
  const filename = path.join(directory, 'history.sqlite');
  let db = new DesktopDatabase(filename);
  if (ready) db.finishMigration({ sessions: 0, projects: 0 }, []);
  t.after(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });
  return { get db() { return db; }, directory, reopen() { db.close(); db = new DesktopDatabase(filename); return db; } };
}

test('global memory keeps only four entries atomically and survives restart', t => {
  const state = setup(t);
  assert.equal(state.db.getGlobalMemory().content.split('\n\n').length, 2);
  for (let i = 1; i <= 5; i++) {
    const before = state.db.getGlobalMemory();
    state.db.saveGlobalMemory({ content: `Facts ${i}.\n\nPreferences ${i}.`, sources: { chat: i }, compacted: i === 5, expectedId: before.entries[0]?.id || 0 });
    assert.ok(state.db.getGlobalMemory().entries.length <= 4);
  }
  const memory = state.reopen().getGlobalMemory();
  assert.deepEqual(memory.entries.map(e => e.id), [5, 4, 3, 2]);
  assert.equal(memory.content, 'Facts 5.\n\nPreferences 5.');
  assert.deepEqual(memory.sources, { chat: 5 });
  assert.ok(memory.lastCompactedAt > 0);
  assert.throws(() => state.db.saveGlobalMemory({ content: 'One paragraph', sources: {}, compacted: false, expectedId: 5 }));
  assert.throws(() => state.db.saveGlobalMemory({ content: 'x'.repeat(2400) + '\n\nMore', sources: {}, compacted: false, expectedId: 5 }));
  assert.throws(() => state.db.saveGlobalMemory({ content: 'Facts.\n\nPreferences.', sources: {}, compacted: false, expectedId: 4 }), /changed/);
  assert.deepEqual(state.db.getGlobalMemory(), memory);
});

test('version 1 databases upgrade memory tables without changing existing conversations', t => {
  const state = setup(t);
  state.db.createSession(session());
  // Reproduce the schema that shipped before automatic memory.
  (state.db as any).db.exec('DROP TRIGGER cap_global_memory; DROP TABLE global_memory; PRAGMA user_version = 1;');
  const db = state.reopen();
  assert.equal(db.listSessions()[0].id, 'session');
  assert.equal(db.getGlobalMemory().entries.length, 0);
  db.saveGlobalMemory({ content: 'Facts.\n\nPreferences.', sources: {}, compacted: false, expectedId: 0 });
  assert.equal(state.reopen().getGlobalMemory().entries.length, 1);
});

test('migration is resumable, preserves archived history and verifies counts before enabling writes', t => {
  const state = setup(t, false);
  assert.throws(() => state.db.createSession(session()), /migration/i);
  const legacy = session('old', { archived: 1, agentContents: '[{"provider":"legacy"}]', projectId: 'project' });
  state.db.importRecord({ kind: 'session', record: legacy });
  state.reopen();
  state.db.importRecord({ kind: 'session', record: legacy });
  state.db.importRecord({ kind: 'project', record: project() });
  assert.throws(() => state.db.finishMigration({ sessions: 2, projects: 1 }, []), /verification/);
  state.db.finishMigration({ sessions: 1, projects: 1 }, []);
  assert.equal(state.db.listSessions().length, 0);
  assert.equal(state.db.loadMessages('old')[0].parts[0].text, 'ކިހިނެއް؟');
  assert.equal(state.db.getProject('project')!.memory, 'Memory');
  assert.throws(() => state.db.importRecord({ kind: 'session', record: legacy }), /already completed/);
});

test('malformed legacy data rolls back its entire record and can be retried', t => {
  const { db } = setup(t, false);
  assert.throws(() => db.importRecord({ kind: 'session', record: session('broken', { agentMessages: 'not JSON' }) }));
  db.importRecord({ kind: 'session', record: session('broken') });
  db.finishMigration({ sessions: 1, projects: 0 }, []);
  assert.equal(db.listSessions().length, 1);
});

test('message checkpoints survive restart, reject stale revisions, preserve tools and remove edited turns', t => {
  const state = setup(t);
  state.db.createSession(session());
  const assistant = { id: 'assistant', role: 'assistant', parts: [{ type: 'text', text: 'Partial reply' }, { type: 'dynamic-tool', toolName: 'present_file', toolCallId: 'tool', state: 'output-available', output: { success: true, _artifact: { filename: 'report.pdf', label: 'Report', mimeType: 'application/pdf', url: 'blob:temporary' } } }] };
  const messages = [...state.db.loadMessages('session'), assistant];
  state.db.saveMessages('session', messages, 1);
  state.db.saveMessages('session', [], 0 + 1);
  state.reopen();
  assert.equal(state.db.messageRevision('session'), 1);
  assert.equal(state.db.loadMessages('session')[1].parts[0].text, 'Partial reply');
  assert.equal(state.db.loadMessages('session')[1].parts[1].output._artifact.url, '');
  assert.equal(state.db.listArtifacts()[0].filename, 'report.pdf');
  assert.equal(state.db.listSessions()[0].agentMessages, undefined);
  state.db.saveMessages('session', [messages[0]], 2);
  assert.equal(state.db.loadMessages('session').length, 1);
  assert.deepEqual(state.db.listArtifacts(), []);
});

test('filesystem snapshots are binary, atomic, and support empty/deleted files', t => {
  const state = setup(t);
  state.db.createSession(session());
  const content = Buffer.from([0, 1, 255, 0, 128]).toString('base64');
  state.db.saveFS('session', { '/mnt/data/a.bin': content, '/mnt/data/empty': '' });
  assert.throws(() => state.db.saveFS('session', { bad: 'invalid' }), /base64/);
  state.reopen();
  assert.deepEqual(state.db.loadFS('session'), { '/mnt/data/a.bin': content, '/mnt/data/empty': '' });
  state.db.saveFS('session', {});
  assert.deepEqual(state.db.loadFS('session'), {});
});

test('project file copies survive restart; deleting a project detaches its chats', t => {
  const state = setup(t);
  state.db.createProject(project());
  state.db.createSession(session('session', { projectId: 'project' }));
  state.db.addProjectFile('project', { id: 'file', name: 'notes.txt', mimeType: 'text/plain', size: 3, addedAt: 30 }, Buffer.from('abc').toString('base64'));
  state.reopen();
  assert.equal(state.db.getProject('project')!.files[0].missing, false);
  assert.equal(state.db.listSessions('project').length, 1);
  state.db.updateProject('project', { instructions: 'New instructions' });
  assert.equal(state.db.getProject('project')!.instructions, 'New instructions');
  state.db.deleteProject('project');
  assert.equal(state.db.listSessions()[0].projectId, undefined);
  assert.equal(state.db.loadMessages('session').length, 1);
});

test('missing legacy project files remain visible with recovery warnings', t => {
  const { db } = setup(t, false);
  const source = project();
  source.files = [{ id: 'missing', name: 'missing.pdf', mimeType: 'application/pdf', size: 99, addedAt: 1, missing: true }];
  db.importRecord({ kind: 'project', record: source });
  db.finishMigration({ sessions: 0, projects: 1 }, ['Please add missing.pdf again']);
  assert.equal(db.getProject('project')!.files[0].missing, true);
  assert.equal(db.migrationStatus().warnings.length, 1);
});

test('legacy artifact steps and current tool parts are both indexed', t => {
  const { db } = setup(t, false);
  db.importRecord({ kind: 'session', record: session('legacy', { agentMessages: JSON.stringify([{ id: 'assistant', role: 'assistant', steps: [{ kind: 'artifact', filename: 'old.pdf', url: 'blob:old' }] }]) }) });
  db.finishMigration({ sessions: 1, projects: 0 }, []);
  assert.equal(db.listArtifacts()[0].filename, 'old.pdf');
  db.archiveSession('legacy');
  assert.equal(db.listArtifacts().length, 0);
});

test('clear chats removes messages and generated files, keeps projects, and does not reimport', t => {
  const state = setup(t);
  state.db.createProject(project());
  state.db.createSession(session());
  state.db.saveFS('session', { '/mnt/data/file': 'YQ==' });
  state.db.clearChats();
  state.reopen();
  assert.equal(state.db.migrationStatus().complete, true);
  assert.deepEqual(state.db.listSessions(), []);
  assert.deepEqual(state.db.loadMessages('session'), []);
  assert.deepEqual(state.db.loadFS('session'), {});
  assert.equal(state.db.listProjects().length, 1);
  assert.throws(() => state.db.saveMessages('session', [], 2), /no longer exists/);
});

test('online backup contains committed WAL messages and file contents', async t => {
  const { db, directory } = setup(t);
  db.createSession(session());
  db.saveFS('session', { '/mnt/data/file': 'YQ==' });
  const backupFile = path.join(directory, 'backup.sqlite');
  await db.backup(backupFile);
  const backup = new DesktopDatabase(backupFile);
  try {
    assert.equal(backup.loadMessages('session')[0].parts[0].text, 'ކިހިނެއް؟');
    assert.deepEqual(backup.loadFS('session'), { '/mnt/data/file': 'YQ==' });
  } finally { backup.close(); }
});

test('renderer migration reads multiple IndexedDB batches without modifying the source', async t => {
  const { db } = setup(t, false);
  const factory = new IDBFactory();
  Object.assign(globalThis, { indexedDB: factory, IDBKeyRange, window: { platform: { storage: Object.fromEntries(storageMethods.map(method => [method, async (...args: any[]) => (db as any)[method](...args)])) } } });
  const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open('mogger-db', 4);
    request.onupgradeneeded = () => { request.result.createObjectStore('sessions', { keyPath: 'id' }); request.result.createObjectStore('projects', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = legacy.transaction(['sessions', 'projects'], 'readwrite');
    for (let n = 0; n < 25; n++) tx.objectStore('sessions').add(session(`session-${n}`));
    tx.objectStore('projects').add(project());
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  const result = await initializeStorage(() => {});
  assert.equal(result.complete, true);
  assert.equal(db.listSessions().length, 25);
  const count = await new Promise<number>(resolve => {
    const request = legacy.transaction('sessions').objectStore('sessions').count();
    request.onsuccess = () => resolve(request.result);
  });
  assert.equal(count, 25);
  db.clearChats();
  await initializeStorage(() => {});
  assert.equal(db.listSessions().length, 0, 'completed migration must not resurrect cleared chats');
  legacy.close();
});

test('fresh desktop startup creates SQLite without creating a legacy IndexedDB database', async t => {
  const { db } = setup(t, false);
  const factory = new IDBFactory();
  Object.assign(globalThis, { indexedDB: factory, IDBKeyRange, window: { platform: { storage: Object.fromEntries(storageMethods.map(method => [method, async (...args: any[]) => (db as any)[method](...args)])) } } });
  assert.equal((await initializeStorage(() => {})).complete, true);
  assert.deepEqual(await factory.databases(), []);
});

test('renderer waits for queued checkpoints before clearing chats and resets writer revisions', async t => {
  const { db } = setup(t);
  Object.assign(globalThis, { window: { platform: { storage: Object.fromEntries(storageMethods.map(method => [method, async (...args: any[]) => (db as any)[method](...args)])) } } });
  db.createSession(session());
  const save = saveAgentMessages('session', [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Queued' }] }]);
  await clearRendererChats();
  await save;
  await flushDesktopStorage();
  assert.deepEqual(db.listSessions(), []);
  db.createSession(session());
  await saveAgentMessages('session', [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'New session' }] }]);
  assert.equal(db.messageRevision('session'), 1);
});

test('built Electron worker serves SQLite and retains acknowledged writes after abrupt termination', async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'raalhu-worker-'));
  const filename = path.join(directory, 'history.sqlite');
  const worker = new Worker(path.resolve('dist/main/storage-worker.js'), { workerData: { filename } });
  t.after(async () => { await worker.terminate(); rmSync(directory, { recursive: true, force: true }); });
  let requestId = 0;
  const call = (method: string, args: unknown[] = []) => new Promise<any>((resolve, reject) => {
    const token = ++requestId;
    const handler = (reply: any) => {
      if (reply.requestId !== token) return;
      worker.off('message', handler); worker.off('error', reject);
      if (reply.error) reject(new Error(reply.error)); else resolve(reply.result);
    };
    worker.on('message', handler); worker.once('error', reject);
    worker.postMessage({ requestId: token, method, args });
  });
  await call('finishMigration', [{ sessions: 0, projects: 0 }, []]);
  await call('createSession', [session()]);
  await assert.rejects(call('exec', ['DELETE FROM sessions']), /Invalid storage operation/);
  await worker.terminate();
  const recovered = new DesktopDatabase(filename);
  try { assert.equal(recovered.loadMessages('session')[0].parts[0].text, 'ކިހިނެއް؟'); }
  finally { recovered.close(); }
});

test('BYOK settings persist without credentials and are separate from conversation deletion', t => {
  const state = setup(t);
  const metadata = {
    preferredRoute: 'byok' as const, validationStatus: 'valid' as const,
    lastValidatedAt: 12345, lastError: 'Temporary network failure', lastFailureKind: 'network' as const, credentialId: 'encrypted-file-digest',
  };
  assert.equal(state.db.getByokPreferences().preferredRoute, 'proxy');
  state.db.saveByokPreferences({ ...metadata, apiKey: 'must-not-persist' } as any);
  assert.deepEqual(state.reopen().getByokPreferences(), metadata);
  state.db.clearChats();
  assert.deepEqual(state.db.getByokPreferences(), metadata);
  assert.throws(() => state.db.saveByokPreferences({ ...metadata, validationStatus: 'made-up' } as any));
  assert.throws(() => state.db.saveByokPreferences({ ...metadata, lastFailureKind: 'made-up' } as any));
  assert.equal((storageMethods as readonly string[]).includes('saveByokPreferences'), false);
});
