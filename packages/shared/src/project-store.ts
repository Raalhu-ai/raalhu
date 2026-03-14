import Dexie from 'dexie';
import { db } from './db';
import type { Project, ProjectFile, ChatSession } from './types';

// --- CRUD ---

export async function createProject(params: {
	id: string;
	name: string;
	instructions?: string;
}): Promise<void> {
	const now = Date.now();
	await db.projects.add({
		id: params.id,
		name: params.name,
		instructions: params.instructions || '',
		memory: '',
		files: [],
		archived: 0,
		createdAt: now,
		updatedAt: now
	});
}

export async function getProject(id: string): Promise<Project | undefined> {
	return db.projects.get(id);
}

export async function listProjects(): Promise<Project[]> {
	return db.projects
		.where('[archived+updatedAt]')
		.between([0, Dexie.minKey], [0, Dexie.maxKey])
		.reverse()
		.toArray();
}

export async function renameProject(id: string, name: string): Promise<void> {
	await db.projects.update(id, { name, updatedAt: Date.now() });
}

export async function updateProjectInstructions(id: string, instructions: string): Promise<void> {
	await db.projects.update(id, { instructions, updatedAt: Date.now() });
}

export async function updateProjectMemory(id: string, memory: string): Promise<void> {
	await db.projects.update(id, { memory, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
	await db.sessions.where('projectId').equals(id).modify({ projectId: undefined });
	await db.projects.delete(id);
}

export async function archiveProject(id: string): Promise<void> {
	await db.projects.update(id, { archived: 1, updatedAt: Date.now() });
}

// --- Files ---

export function totalFileSizeBytes(files: ProjectFile[]): number {
	return files.reduce((sum, f) => sum + f.size, 0);
}

export async function addFileToProject(projectId: string, file: ProjectFile): Promise<void> {
	const project = await db.projects.get(projectId);
	if (!project) throw new Error('Project not found');
	const files = [...project.files, file];
	await db.projects.update(projectId, { files, updatedAt: Date.now() });
}

export async function removeFileFromProject(projectId: string, fileId: string): Promise<void> {
	const project = await db.projects.get(projectId);
	if (!project) throw new Error('Project not found');
	const files = project.files.filter((f) => f.id !== fileId);
	await db.projects.update(projectId, { files, updatedAt: Date.now() });
}

// --- Session association ---

export async function getProjectSessions(projectId: string): Promise<ChatSession[]> {
	const all = await db.sessions.where('projectId').equals(projectId).toArray();
	return all.filter((s) => s.archived === 0).sort((a, b) => b.updatedAt - a.updatedAt);
}
