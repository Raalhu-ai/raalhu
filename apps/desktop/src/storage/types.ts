import type { ChatSession, Project as SharedProject } from '../../../../packages/shared/src/types';

export type Session = ChatSession;
export interface ProjectFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  addedAt: number;
  missing?: boolean;
}
export interface Project extends Omit<SharedProject, 'files'> { files: ProjectFile[] }
export interface ArtifactRecord {
  filename: string;
  label: string;
  mimeType: string;
  sessionId: string;
  sessionTitle: string;
}
export interface MigrationRecord {
  kind: 'session' | 'project';
  record: Session | Project;
  files?: Record<string, string>;
}
export interface MigrationStatus { complete: boolean; warnings: string[] }
export interface GlobalMemoryEntry { id: number; content: string; createdAt: number }
export interface GlobalMemoryState {
  content: string;
  entries: GlobalMemoryEntry[];
  sources: Record<string, number>;
  lastCompactedAt: number;
}
export interface GlobalMemoryUpdate {
  content: string;
  sources: Record<string, number>;
  compacted: boolean;
  expectedId: number;
}

// All operations are named and allowlisted. SQL and host paths never cross this API.
export interface StorageAPI {
  getGlobalMemory(): Promise<GlobalMemoryState>;
  saveGlobalMemory(update: GlobalMemoryUpdate): Promise<void>;
  migrationStatus(): Promise<MigrationStatus>;
  importRecord(record: MigrationRecord): Promise<void>;
  finishMigration(counts: { sessions: number; projects: number }, warnings: string[]): Promise<void>;
  listSessions(projectId?: string): Promise<Session[]>;
  createSession(session: Session): Promise<void>;
  loadMessages(id: string): Promise<any[]>;
  messageRevision(id: string): Promise<number>;
  saveMessages(id: string, messages: any[], revision: number): Promise<void>;
  renameSession(id: string, title: string): Promise<void>;
  archiveSession(id: string): Promise<void>;
  clearChats(): Promise<void>;
  loadFS(id: string): Promise<Record<string, string>>;
  saveFS(id: string, files: Record<string, string>): Promise<void>;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: Project): Promise<void>;
  updateProject(id: string, patch: { name?: string; instructions?: string; memory?: string }): Promise<void>;
  deleteProject(id: string): Promise<void>;
  addProjectFile(id: string, file: ProjectFile, base64: string): Promise<void>;
  removeProjectFile(id: string, fileId: string): Promise<void>;
  listArtifacts(): Promise<ArtifactRecord[]>;
}
export const storageMethods = [
  'getGlobalMemory', 'saveGlobalMemory',
  'migrationStatus', 'importRecord', 'finishMigration', 'listSessions', 'createSession',
  'loadMessages', 'messageRevision', 'saveMessages', 'renameSession', 'archiveSession', 'clearChats',
  'loadFS', 'saveFS', 'listProjects', 'getProject', 'createProject', 'updateProject',
  'deleteProject', 'addProjectFile', 'removeProjectFile', 'listArtifacts',
] as const satisfies readonly (keyof StorageAPI)[];
