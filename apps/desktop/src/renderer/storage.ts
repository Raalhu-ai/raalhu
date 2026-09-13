import type { Project, ProjectFile, Session, StorageAPI } from '../storage/types';
import { englishToThaana } from '@raalhu/shared/src/transliterate';
export type { Project, ProjectFile } from '../storage/types';

export function storage(): StorageAPI {
  if (!window.platform?.storage) throw new Error('Desktop storage is unavailable. Restart the desktop app.');
  return window.platform.storage;
}
export const listSessions = () => storage().listSessions();
export const loadAgentMessages = (id: string) => storage().loadMessages(id);
const revisions = new Map<string, number>();
let writes: Promise<unknown> = Promise.resolve();
export function saveAgentMessages(id: string, messages: any[]): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(messages));
  const write = writes.catch(() => {}).then(async () => {
    const revision = (revisions.get(id) ?? await storage().messageRevision(id)) + 1;
    revisions.set(id, revision);
    await storage().saveMessages(id, snapshot, revision);
  });
  writes = write;
  return write;
}
export const flushStorageWrites = () => writes;
const flushers = new Set<() => Promise<void>>();
export function registerStorageFlush(callback: () => Promise<void>) {
  flushers.add(callback);
  return () => { flushers.delete(callback); };
}
export async function flushDesktopStorage() {
  for (const callback of flushers) await callback();
  await flushStorageWrites();
}
export const loadAgentFS = (id: string) => storage().loadFS(id);
export const saveAgentFS = (id: string, files: Record<string, string>) => storage().saveFS(id, files);
export const renameSession = (id: string, title: string) => storage().renameSession(id, title);
export const updateSessionTitle = renameSession;
export const archiveSession = (id: string) => storage().archiveSession(id);
export async function clearChats() {
  // Finish older checkpoints before deletion so a late write cannot revive a chat.
  await writes.catch(() => {});
  await storage().clearChats();
  revisions.clear();
  writes = Promise.resolve();
}
export async function createSession(params: { id: string; model: string; messages: { id: string; role: string; content: string }[]; projectId?: string }) {
  const now = Date.now();
  const first = params.messages.find(m => m.role === 'user')?.content.trim() || 'ޗެޓް';
  const session: Session = { ...params, title: englishToThaana(first.length > 50 ? first.slice(0, 50) + '...' : first), modeId: 'agent', body: { model: params.model }, archived: 0, createdAt: now, updatedAt: now };
  await storage().createSession(session);
}
export const listProjects = () => storage().listProjects();
export const getProject = (id: string) => storage().getProject(id);
export const getProjectSessions = (id: string) => storage().listSessions(id);
export const renameProject = (id: string, name: string) => storage().updateProject(id, { name });
export const updateProjectInstructions = (id: string, instructions: string) => storage().updateProject(id, { instructions });
export const updateProjectMemory = (id: string, memory: string) => storage().updateProject(id, { memory });
export const deleteProject = (id: string) => storage().deleteProject(id);
export const removeFileFromProject = (id: string, fileId: string) => storage().removeProjectFile(id, fileId);
export const totalFileSizeBytes = (files: ProjectFile[]) => files.reduce((sum, f) => sum + f.size, 0);
export async function createProject(params: { id: string; name: string; instructions?: string }) {
  const project: Project = { ...params, instructions: params.instructions || '', memory: '', files: [], archived: 0, createdAt: Date.now(), updatedAt: Date.now() };
  await storage().createProject(project);
}
export function fileBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
export async function addFileToProject(id: string, file: File) {
  await storage().addProjectFile(id, { id: crypto.randomUUID(), name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, addedAt: Date.now() }, await fileBase64(file));
}

export function formatRelativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return '\u0789\u07A8\u0780\u07A7\u0783\u07AA';
	if (minutes < 60) return `${minutes} \u0789\u07A8\u0782\u07AC\u0793\u07B0 \u0786\u07AA\u0783\u07A8\u0782\u07B0`;
	if (hours < 24) return `${hours} \u078E\u07A6\u0791\u07A8\u0787\u07A8\u0783\u07AA \u0786\u07AA\u0783\u07A8\u0782\u07B0`;
	if (days === 1) return '\u0787\u07A8\u0787\u07B0\u0794\u07AC';
	if (days < 7) return `${days} \u078B\u07AA\u0788\u07A6\u0790\u07B0 \u0786\u07AA\u0783\u07A8\u0782\u07B0`;
	if (days < 30) return `${Math.floor(days / 7)} \u0780\u07A6\u078A\u07B0\u078C\u07A7 \u0786\u07AA\u0783\u07A8\u0782\u07B0`;
	return `${Math.floor(days / 30)} \u0789\u07A6\u0790\u07B0 \u0786\u07AA\u0783\u07A8\u0782\u07B0`;
}
