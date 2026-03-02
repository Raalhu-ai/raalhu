import Dexie, { type EntityTable } from 'dexie';

export interface SerializedMessage {
	id: string;
	role: string;
	content: string;
	createdAt?: string;
	annotations?: unknown[];
}

export interface ChatSession {
	id: string;
	title: string;
	modeId: string;
	model: string;
	messages: SerializedMessage[];
	body: Record<string, unknown>;
	formData?: Record<string, string>;
	archived: 0 | 1;
	createdAt: number;
	updatedAt: number;
	/** Agent mode: serialized AgentMessage[] */
	agentMessages?: string;
	/** Agent mode: serialized Gemini contents history (raw, with thoughtSignature etc.) */
	agentContents?: string;
	/** Agent mode: serialized FS snapshot { [path]: base64data } */
	fsSnapshot?: string;
	/** Project this session belongs to (undefined = unassigned) */
	projectId?: string;
}

export interface ProjectFile {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	/** Persistent file handle — stored via structured clone in IndexedDB */
	handle: FileSystemFileHandle;
	addedAt: number;
}

export interface Project {
	id: string;
	name: string;
	instructions: string;
	memory: string;
	files: ProjectFile[];
	archived: 0 | 1;
	createdAt: number;
	updatedAt: number;
}

const db = new Dexie('mogger-db') as Dexie & {
	sessions: EntityTable<ChatSession, 'id'>;
	projects: EntityTable<Project, 'id'>;
};

db.version(1).stores({
	sessions: 'id, [archived+updatedAt], updatedAt'
});

db.version(2).stores({
	sessions: 'id, [archived+updatedAt], updatedAt, projectId',
	projects: 'id, [archived+updatedAt], updatedAt'
});

// v3: migrate from base64 file data to FileSystemFileHandle references
db.version(3).stores({
	sessions: 'id, [archived+updatedAt], updatedAt, projectId',
	projects: 'id, [archived+updatedAt], updatedAt'
}).upgrade(async (tx) => {
	await tx.table('projects').toCollection().modify((project: Project) => {
		project.files = [];
	});
});

// v4: add memory field to projects
db.version(4).stores({
	sessions: 'id, [archived+updatedAt], updatedAt, projectId',
	projects: 'id, [archived+updatedAt], updatedAt'
}).upgrade(async (tx) => {
	await tx.table('projects').toCollection().modify((project: Project) => {
		if (!project.memory) project.memory = '';
	});
});

export { db };
