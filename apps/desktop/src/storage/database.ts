import Database from 'better-sqlite3';
import { defaultByokPreferences, type ByokPreferences } from '../byok-types';
import { createHash } from 'node:crypto';
import type { ArtifactRecord, MigrationRecord, Project, ProjectFile, Session } from './types';
import type { GlobalMemoryState, GlobalMemoryUpdate } from './types';
import { EMPTY_MEMORY, validateGlobalMemory } from '../global-memory';

function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`);
}
function id(value: unknown): asserts value is string {
  text(value, 'ID');
  if (!value || value.length > 512) throw new Error('Invalid ID');
}
function decode(value: unknown): Buffer {
  text(value, 'file content');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) throw new Error('Invalid base64 file content');
  return bytes;
}
function messageArray(value: unknown): any[] {
  if (!Array.isArray(value)) throw new Error('Invalid messages');
  const ids = new Set<string>();
  for (const message of value) {
    id(message?.id);
    if (ids.has(message.id)) throw new Error('Duplicate message ID');
    ids.add(message.id);
    text(message.role, 'message role');
  }
  return value;
}
function cleanMessage(message: any): any {
  // Persist file identity, never temporary blob URLs. Keep all other tool data.
  const copy = JSON.parse(JSON.stringify(message));
  for (const step of copy.steps || []) if (step.kind === 'artifact') step.url = '';
  for (const part of copy.parts || []) {
    if (part.output?._artifact) part.output._artifact.url = '';
  }
  if (!Array.isArray(copy.parts)) {
    const parts: any[] = [];
    for (const [index, step] of (copy.steps || []).entries()) {
      if (step.kind === 'text') parts.push({ type: 'text', text: step.content || '' });
      else if (step.kind === 'thinking') parts.push({ type: 'reasoning', text: step.content || '' });
      else if (step.kind === 'tool-call') parts.push({ type: 'dynamic-tool', toolName: step.name, toolCallId: `${copy.id}-${index}`, input: step.args || {}, state: step.status === 'done' ? 'output-available' : 'output-error', ...(step.status === 'done' ? { output: step.result ?? {} } : { errorText: 'Tool execution was interrupted or failed.' }) });
      else if (step.kind === 'artifact') parts.push({ type: 'dynamic-tool', toolName: 'present_file', toolCallId: `${copy.id}-${index}`, input: { path: step.uri || step.filename }, state: 'output-available', output: { success: true, _artifact: { ...step, url: '' } } });
      else if (['message-compose', 'recipe-display', 'show-widget'].includes(step.kind)) parts.push({ type: 'dynamic-tool', toolName: ({ 'message-compose': 'compose_message', 'recipe-display': 'display_recipe', 'show-widget': 'show_widget' } as Record<string, string>)[step.kind], toolCallId: `${copy.id}-${index}`, input: step.data || {}, state: 'output-available', output: { success: true } });
    }
    if (!parts.some(part => part.type === 'text') && copy.content) parts.unshift({ type: 'text', text: copy.content });
    copy.parts = parts;
  }
  return copy;
}

/** Owned by one Electron worker. No renderer/Chromium dependencies. */
export class DesktopDatabase {
  private db: Database.Database;

  constructor(filename: string) {
    this.db = new Database(filename);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    const version = this.db.pragma('user_version', { simple: true }) as number;
    if (version > 2) {
      this.db.close();
      throw new Error('This data was created by a newer Raalhu version. Please update the app.');
    }
    if (version === 0) this.db.transaction(() => {
      this.db.exec(`
        CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE projects (id TEXT PRIMARY KEY, archived INTEGER NOT NULL, updated_at INTEGER NOT NULL, data TEXT NOT NULL);
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, project_id TEXT,
          archived INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL
        );
        CREATE INDEX session_activity ON sessions(archived, updated_at DESC);
        CREATE INDEX session_project ON sessions(project_id, archived, updated_at DESC);
        CREATE TABLE messages (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL,
          PRIMARY KEY(session_id, id)
        );
        CREATE INDEX message_order ON messages(session_id, position);
        CREATE TABLE session_files (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          path TEXT NOT NULL, content BLOB NOT NULL, PRIMARY KEY(session_id, path)
        );
        CREATE TABLE project_files (
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          id TEXT NOT NULL, data TEXT NOT NULL, content BLOB, PRIMARY KEY(project_id, id)
        );
        CREATE TABLE artifacts (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          message_id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL,
          PRIMARY KEY(session_id, message_id, position)
        );
        CREATE TABLE legacy_records (
          kind TEXT NOT NULL, id TEXT NOT NULL, hash TEXT NOT NULL, data TEXT NOT NULL,
          PRIMARY KEY(kind, id)
        );
        PRAGMA user_version = 1;
      `);
    })();
    if (version < 2) this.db.transaction(() => {
      this.db.exec(`
        CREATE TABLE global_memory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL CHECK(length(content) <= 2400),
          created_at INTEGER NOT NULL
        );
        CREATE TRIGGER cap_global_memory AFTER INSERT ON global_memory BEGIN
          DELETE FROM global_memory WHERE id NOT IN (SELECT id FROM global_memory ORDER BY id DESC LIMIT 4);
        END;
        PRAGMA user_version = 2;
      `);
    })();
  }

  getGlobalMemory(): GlobalMemoryState {
    const entries = this.db.prepare('SELECT id, content, created_at AS createdAt FROM global_memory ORDER BY id DESC').all() as GlobalMemoryState['entries'];
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'global-memory-state'").get() as { value: string } | undefined;
    const state = row ? JSON.parse(row.value) : {};
    return { content: entries[0]?.content || EMPTY_MEMORY, entries, sources: state.sources || {}, lastCompactedAt: state.lastCompactedAt || 0 };
  }

  saveGlobalMemory(update: GlobalMemoryUpdate) {
    this.ready();
    const content = validateGlobalMemory(update?.content);
    if (!update.sources || Array.isArray(update.sources) || typeof update.sources !== 'object' || Object.keys(update.sources).length > 4 ||
        Object.entries(update.sources).some(([key, revision]) => !key || key.length > 512 || !Number.isSafeInteger(revision) || revision < 0) ||
        typeof update.compacted !== 'boolean' || !Number.isSafeInteger(update.expectedId)) throw new Error('Invalid memory update');
    this.db.transaction(() => {
      const previous = this.getGlobalMemory();
      if ((previous.entries[0]?.id || 0) !== update.expectedId) throw new Error('Global memory changed during update');
      const now = Date.now();
      this.db.prepare('INSERT INTO global_memory(content,created_at) VALUES(?,?)').run(content, now);
      this.db.prepare("INSERT INTO meta(key,value) VALUES('global-memory-state',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
        .run(JSON.stringify({ sources: update.sources, lastCompactedAt: update.compacted || !previous.lastCompactedAt ? now : previous.lastCompactedAt }));
    })();
  }

  close() { this.db.close(); }
  getByokPreferences(): ByokPreferences {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'byok-settings'").get() as { value: string } | undefined;
    return row ? { ...defaultByokPreferences, ...JSON.parse(row.value) } : { ...defaultByokPreferences };
  }
  saveByokPreferences(value: ByokPreferences) {
    if (!['proxy', 'byok'].includes(value.preferredRoute) || !['untested', 'valid', 'invalid'].includes(value.validationStatus) ||
        (value.lastValidatedAt !== null && !Number.isFinite(value.lastValidatedAt)) ||
        (value.lastFailureKind != null && !['credentials', 'quota', 'network', 'model-access', 'cancelled', 'unknown'].includes(value.lastFailureKind)) ||
        typeof value.lastError !== 'string' || value.lastError.length > 500 || typeof value.credentialId !== 'string') throw new Error('Invalid BYOK settings');
    const { preferredRoute, validationStatus, lastValidatedAt, lastError, credentialId, lastFailureKind = null } = value;
    this.db.prepare("INSERT INTO meta(key,value) VALUES('byok-settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(JSON.stringify({ preferredRoute, validationStatus, lastValidatedAt, lastError, credentialId, lastFailureKind }));
  }
  backup(filename: string) { return this.db.backup(filename); }
  migrationStatus() {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'indexeddb-import'").get() as { value: string } | undefined;
    return { complete: !!row, warnings: row ? JSON.parse(row.value) as string[] : [] };
  }
  private ready() {
    if (!this.migrationStatus().complete) throw new Error('History migration must finish first');
  }
  private requireSession(sessionId: string) {
    id(sessionId);
    if (!this.db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(sessionId)) throw new Error('Conversation no longer exists');
  }
  private insertSession(session: Session) {
    id(session.id);
    text(session.title, 'title');
    text(session.model, 'model');
    if (![0, 1].includes(session.archived) || !Number.isFinite(session.updatedAt) || !Number.isFinite(session.createdAt)) throw new Error('Invalid session metadata');
    const { agentMessages, agentContents, fsSnapshot, messages, ...metadata } = session;
    this.db.prepare('INSERT INTO sessions(id,title,project_id,archived,updated_at,data) VALUES(?,?,?,?,?,?)')
      .run(session.id, session.title, session.projectId ?? null, session.archived, session.updatedAt, JSON.stringify(metadata));
    // Legacy provider contents remain preserved in legacy_records.
    const initial = agentMessages ? messageArray(JSON.parse(agentMessages)) : messageArray(messages || []).map(m => ({
      ...m, parts: [{ type: 'text', text: m.content || '' }],
    }));
    this.writeMessages(session.id, initial);
    if (fsSnapshot) this.writeFS(session.id, JSON.parse(fsSnapshot));
  }
  private insertProject(project: Project, files: Record<string, string> = {}) {
    id(project.id);
    text(project.name, 'project name');
    if (![0, 1].includes(project.archived) || !Number.isFinite(project.updatedAt)) throw new Error('Invalid project metadata');
    const { files: metadata, ...rest } = project;
    this.db.prepare('INSERT INTO projects VALUES(?,?,?,?)').run(project.id, project.archived, project.updatedAt, JSON.stringify(rest));
    for (const file of metadata || []) this.writeProjectFile(project.id, file, files[file.id]);
  }
  importRecord(input: MigrationRecord) {
    if (this.migrationStatus().complete) throw new Error('History migration already completed');
    if (!input || !['session', 'project'].includes(input.kind)) throw new Error('Invalid migration record');
    id(input.record?.id);
    const serialized = JSON.stringify(input);
    const hash = createHash('sha256').update(serialized).digest('hex');
    this.db.transaction(() => {
      const previous = this.db.prepare('SELECT hash FROM legacy_records WHERE kind = ? AND id = ?').get(input.kind, input.record.id) as { hash: string } | undefined;
      if (previous?.hash === hash) return;
      // Retry an interrupted import, including a file that has become readable.
      if (previous) this.db.prepare(`DELETE FROM ${input.kind === 'session' ? 'sessions' : 'projects'} WHERE id = ?`).run(input.record.id);
      if (input.kind === 'session') this.insertSession(input.record as Session);
      else this.insertProject(input.record as Project, input.files);
      this.db.prepare('INSERT OR REPLACE INTO legacy_records VALUES(?,?,?,?)').run(input.kind, input.record.id, hash, serialized);
    })();
  }
  finishMigration(counts: { sessions: number; projects: number }, warnings: string[]) {
    if (this.migrationStatus().complete) return;
    if (!counts || !Array.isArray(warnings) || warnings.some(w => typeof w !== 'string')) throw new Error('Invalid migration summary');
    this.db.transaction(() => {
      for (const [kind, table] of [['session', 'sessions'], ['project', 'projects']] as const) {
        const expected = counts[table];
        const { count } = this.db.prepare('SELECT COUNT(*) AS count FROM legacy_records WHERE kind = ?').get(kind) as { count: number };
        const actual = this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
        if (!Number.isSafeInteger(expected) || expected !== count || expected !== actual.count) throw new Error(`Migration verification failed for ${table}`);
      }
      if (this.db.pragma('integrity_check', { simple: true }) !== 'ok' || (this.db.pragma('foreign_key_check') as unknown[]).length) throw new Error('Database integrity check failed');
      this.db.prepare("INSERT INTO meta VALUES('indexeddb-import', ?)").run(JSON.stringify(warnings));
    })();
  }
  listSessions(projectId?: string): Session[] {
    this.ready();
    if (projectId !== undefined) id(projectId);
    const rows = projectId === undefined
      ? this.db.prepare('SELECT data,title,project_id,archived,updated_at FROM sessions WHERE archived = 0 ORDER BY updated_at DESC').all()
      : this.db.prepare('SELECT data,title,project_id,archived,updated_at FROM sessions WHERE archived = 0 AND project_id = ? ORDER BY updated_at DESC').all(projectId);
    return (rows as any[]).map(row => ({ ...JSON.parse(row.data), title: row.title, projectId: row.project_id ?? undefined, archived: row.archived, updatedAt: row.updated_at, messages: [] }));
  }
  createSession(session: Session) { this.ready(); this.db.transaction(() => this.insertSession(session))(); }
  loadMessages(sessionId: string): any[] {
    this.ready(); id(sessionId);
    return (this.db.prepare('SELECT data FROM messages WHERE session_id = ? ORDER BY position').all(sessionId) as { data: string }[]).map(row => JSON.parse(row.data));
  }
  messageRevision(sessionId: string): number {
    this.ready(); this.requireSession(sessionId);
    return (this.db.prepare('SELECT revision FROM sessions WHERE id = ?').get(sessionId) as { revision: number }).revision;
  }
  private writeMessages(sessionId: string, messages: any[]) {
    messageArray(messages);
    const put = this.db.prepare(`INSERT INTO messages VALUES(?,?,?,?) ON CONFLICT(session_id,id) DO UPDATE SET position=excluded.position,data=excluded.data WHERE position != excluded.position OR data != excluded.data`);
    const artifactPut = this.db.prepare('INSERT INTO artifacts VALUES(?,?,?,?)');
    for (const [position, original] of messages.entries()) {
      const message = cleanMessage(original);
      const result = put.run(sessionId, message.id, position, JSON.stringify(message));
      if (result.changes) {
        this.db.prepare('DELETE FROM artifacts WHERE session_id = ? AND message_id = ?').run(sessionId, message.id);
        const artifacts = message.parts.filter((p: any) => p.output?._artifact).map((p: any) => p.output._artifact);
        artifacts.forEach((artifact: any, index: number) => artifactPut.run(sessionId, message.id, index, JSON.stringify({ filename: artifact.filename || 'file', label: artifact.label || artifact.filename || 'Artifact', mimeType: artifact.mimeType || '' })));
      }
    }
    // Also supports editing/regenerating a conversation, without retaining removed turns.
    const keep = new Set(messages.map(m => m.id));
    const previous = this.db.prepare('SELECT id FROM messages WHERE session_id = ?').all(sessionId) as { id: string }[];
    for (const row of previous) if (!keep.has(row.id)) {
      this.db.prepare('DELETE FROM messages WHERE session_id = ? AND id = ?').run(sessionId, row.id);
      this.db.prepare('DELETE FROM artifacts WHERE session_id = ? AND message_id = ?').run(sessionId, row.id);
    }
  }
  saveMessages(sessionId: string, messages: any[], revision: number) {
    this.ready(); this.requireSession(sessionId);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid message revision');
    this.db.transaction(() => {
      const current = this.db.prepare('SELECT revision FROM sessions WHERE id = ?').get(sessionId) as { revision: number };
      if (revision <= current.revision) return;
      this.writeMessages(sessionId, messages);
      this.db.prepare('UPDATE sessions SET revision = ?, updated_at = ? WHERE id = ?').run(revision, Date.now(), sessionId);
    })();
  }
  renameSession(sessionId: string, title: string) { this.ready(); this.requireSession(sessionId); text(title, 'title'); this.db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, Date.now(), sessionId); }
  archiveSession(sessionId: string) { this.ready(); this.requireSession(sessionId); this.db.prepare('UPDATE sessions SET archived = 1, updated_at = ? WHERE id = ?').run(Date.now(), sessionId); }
  clearChats() {
    this.ready();
    this.db.transaction(() => {
      this.db.exec('DELETE FROM sessions');
      this.db.prepare("DELETE FROM legacy_records WHERE kind = 'session'").run();
    })();
  }
  loadFS(sessionId: string): Record<string, string> {
    this.ready(); id(sessionId);
    return Object.fromEntries((this.db.prepare('SELECT path,content FROM session_files WHERE session_id = ?').all(sessionId) as { path: string; content: Buffer }[]).map(row => [row.path, row.content.toString('base64')]));
  }
  private writeFS(sessionId: string, files: Record<string, string>) {
    if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Invalid filesystem snapshot');
    this.db.prepare('DELETE FROM session_files WHERE session_id = ?').run(sessionId);
    const put = this.db.prepare('INSERT INTO session_files VALUES(?,?,?)');
    for (const [path, content] of Object.entries(files)) put.run(sessionId, path, decode(content));
  }
  saveFS(sessionId: string, files: Record<string, string>) { this.ready(); this.requireSession(sessionId); this.db.transaction(() => this.writeFS(sessionId, files))(); }
  listProjects(): Project[] {
    this.ready();
    return (this.db.prepare('SELECT id FROM projects WHERE archived = 0 ORDER BY updated_at DESC').all() as { id: string }[]).map(row => this.getProject(row.id)!);
  }
  getProject(projectId: string): Project | undefined {
    this.ready(); id(projectId);
    const row = this.db.prepare('SELECT data,updated_at FROM projects WHERE id = ?').get(projectId) as { data: string; updated_at: number } | undefined;
    if (!row) return;
    const files = (this.db.prepare('SELECT data FROM project_files WHERE project_id = ?').all(projectId) as { data: string }[]).map(file => JSON.parse(file.data));
    return { ...JSON.parse(row.data), updatedAt: row.updated_at, files };
  }
  createProject(project: Project) { this.ready(); this.db.transaction(() => this.insertProject(project))(); }
  updateProject(projectId: string, patch: { name?: string; instructions?: string; memory?: string }) {
    this.ready(); id(projectId);
    if (!patch || Object.keys(patch).some(key => !['name', 'instructions', 'memory'].includes(key))) throw new Error('Invalid project update');
    for (const value of Object.values(patch)) text(value, 'project field');
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project no longer exists');
    const { files, ...data } = project;
    this.db.prepare('UPDATE projects SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify({ ...data, ...patch }), Date.now(), projectId);
  }
  deleteProject(projectId: string) {
    this.ready(); id(projectId);
    this.db.transaction(() => {
      this.db.prepare('UPDATE sessions SET project_id = NULL WHERE project_id = ?').run(projectId);
      this.db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      this.db.prepare("DELETE FROM legacy_records WHERE kind = 'project' AND id = ?").run(projectId);
    })();
  }
  private writeProjectFile(projectId: string, file: ProjectFile, base64?: string) {
    id(file.id); text(file.name, 'filename'); text(file.mimeType, 'MIME type');
    const content = base64 === undefined ? null : decode(base64);
    if (content && content.length !== file.size) throw new Error('Project file size mismatch');
    this.db.prepare('INSERT OR REPLACE INTO project_files VALUES(?,?,?,?)').run(projectId, file.id, JSON.stringify({ ...file, missing: content === null }), content);
  }
  addProjectFile(projectId: string, file: ProjectFile, base64: string) {
    this.ready(); id(projectId); text(base64, 'file content');
    this.db.transaction(() => {
      this.writeProjectFile(projectId, file, base64);
      this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), projectId);
    })();
  }
  removeProjectFile(projectId: string, fileId: string) {
    this.ready(); id(projectId); id(fileId);
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM project_files WHERE project_id = ? AND id = ?').run(projectId, fileId);
      this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), projectId);
    })();
  }
  listArtifacts(): ArtifactRecord[] {
    this.ready();
    return (this.db.prepare('SELECT a.data,a.session_id,s.title FROM artifacts a JOIN sessions s ON s.id = a.session_id WHERE s.archived = 0 ORDER BY s.updated_at DESC,a.message_id,a.position').all() as any[])
      .map(row => ({ ...JSON.parse(row.data), sessionId: row.session_id, sessionTitle: row.title }));
  }
}
