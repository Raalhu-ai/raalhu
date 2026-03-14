import Dexie from 'dexie';
import { db } from './db';
import type { ChatSession, SerializedMessage } from './types';

// --- Serialization helpers ---

export interface ChatMessage {
	id: string;
	role: string;
	content: string;
	createdAt?: Date;
	annotations?: unknown[];
}

export function serializeMessages(messages: ChatMessage[]): SerializedMessage[] {
	return messages.map((m) => ({
		id: m.id,
		role: m.role,
		content: m.content,
		createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
		annotations: (m as any).annotations
	}));
}

export function deserializeMessages(serialized: SerializedMessage[]): ChatMessage[] {
	return serialized.map((m) => ({
		id: m.id,
		role: m.role,
		content: m.content,
		createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
		annotations: m.annotations
	}));
}

// --- Title generation ---

export function generateTitle(messages: ChatMessage[]): string {
	const firstUser = messages.find((m) => m.role === 'user' && !m.id.startsWith('sys-'));
	if (firstUser) {
		const text = firstUser.content.trim();
		return text.length > 50 ? text.slice(0, 50) + '...' : text;
	}
	return '\u0797\u07AC\u0793\u07B0';
}

// --- Relative time formatting (Dhivehi) ---

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

// --- CRUD operations ---

export async function createSession(params: {
	id: string;
	model: string;
	messages: ChatMessage[];
	projectId?: string;
}): Promise<void> {
	const now = Date.now();
	const title = generateTitle(params.messages);

	await db.sessions.add({
		id: params.id,
		title,
		modeId: 'agent',
		model: params.model,
		messages: serializeMessages(params.messages),
		body: { model: params.model },
		archived: 0,
		createdAt: now,
		updatedAt: now,
		projectId: params.projectId
	});
}

export async function saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
	await db.sessions.update(sessionId, {
		messages: serializeMessages(messages),
		updatedAt: Date.now()
	});
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
	await db.sessions.update(sessionId, { title, updatedAt: Date.now() });
}

export async function listSessions(): Promise<ChatSession[]> {
	return db.sessions
		.where('[archived+updatedAt]')
		.between([0, Dexie.minKey], [0, Dexie.maxKey])
		.reverse()
		.toArray();
}

export async function getSession(id: string): Promise<ChatSession | undefined> {
	return db.sessions.get(id);
}

export async function renameSession(id: string, newTitle: string): Promise<void> {
	await db.sessions.update(id, { title: newTitle, updatedAt: Date.now() });
}

export async function archiveSession(id: string): Promise<void> {
	await db.sessions.update(id, { archived: 1, updatedAt: Date.now() });
}

export async function deleteSession(id: string): Promise<void> {
	await db.sessions.delete(id);
}

// --- Agent mode persistence ---

export async function saveAgentMessages(sessionId: string, messages: any[]): Promise<void> {
	const cleaned = messages.map((m: any) => ({
		...m,
		steps: m.steps?.map((s: any) =>
			s.kind === 'artifact' ? { ...s, url: '' } : s
		)
	}));
	await db.sessions.update(sessionId, {
		agentMessages: JSON.stringify(cleaned),
		updatedAt: Date.now()
	});
}

export async function loadAgentMessages(sessionId: string): Promise<any[] | null> {
	const session = await db.sessions.get(sessionId);
	if (!session?.agentMessages) return null;
	try {
		return JSON.parse(session.agentMessages);
	} catch {
		return null;
	}
}

export async function saveAgentContents(sessionId: string, contents: any[]): Promise<void> {
	await db.sessions.update(sessionId, {
		agentContents: JSON.stringify(contents),
		updatedAt: Date.now()
	});
}

export async function loadAgentContents(sessionId: string): Promise<any[] | null> {
	const session = await db.sessions.get(sessionId);
	if (!session?.agentContents) return null;
	try {
		return JSON.parse(session.agentContents);
	} catch {
		return null;
	}
}

export async function saveAgentFS(sessionId: string, files: Record<string, string>): Promise<void> {
	await db.sessions.update(sessionId, {
		fsSnapshot: JSON.stringify(files),
		updatedAt: Date.now()
	});
}

export async function loadAgentFS(sessionId: string): Promise<Record<string, string> | null> {
	const session = await db.sessions.get(sessionId);
	if (!session?.fsSnapshot) return null;
	try {
		return JSON.parse(session.fsSnapshot);
	} catch {
		return null;
	}
}

// --- AI title generation ---

export async function fetchAITitle(message: string): Promise<string> {
	try {
		const res = await fetch('/api/title', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message })
		});
		if (!res.ok) return '';
		const { title } = await res.json();
		return (title || '').trim();
	} catch {
		return '';
	}
}
