import Dexie, { type EntityTable } from 'dexie';
import type { ChatSession, Project } from './types';

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

db.version(3).stores({
	sessions: 'id, [archived+updatedAt], updatedAt, projectId',
	projects: 'id, [archived+updatedAt], updatedAt'
}).upgrade(async (tx) => {
	await tx.table('projects').toCollection().modify((project: Project) => {
		project.files = [];
	});
});

db.version(4).stores({
	sessions: 'id, [archived+updatedAt], updatedAt, projectId',
	projects: 'id, [archived+updatedAt], updatedAt'
}).upgrade(async (tx) => {
	await tx.table('projects').toCollection().modify((project: Project) => {
		if (!project.memory) project.memory = '';
	});
});

export { db };
