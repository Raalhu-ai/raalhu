import Dexie from 'dexie';
import { db, type ChatSession, type SerializedMessage } from '$lib/db';
import type { Message } from '@ai-sdk/svelte';
// --- Serialization helpers ---

export function serializeMessages(messages: Message[]): SerializedMessage[] {
	return messages.map((m) => ({
		id: m.id,
		role: m.role,
		content: m.content,
		createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
		annotations: (m as any).annotations
	}));
}

export function deserializeMessages(serialized: SerializedMessage[]): Message[] {
	return serialized.map((m) => ({
		id: m.id,
		role: m.role as Message['role'],
		content: m.content,
		createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
		annotations: m.annotations
	})) as Message[];
}

// --- Title generation ---

export function generateTitle(
	messages: Message[]
): string {
	const firstUser = messages.find((m) => m.role === 'user' && !m.id.startsWith('sys-'));
	if (firstUser) {
		const text = firstUser.content.trim();
		return text.length > 50 ? text.slice(0, 50) + '...' : text;
	}
	return 'ޗެޓް';
}

// --- Relative time formatting (Dhivehi) ---

export function formatRelativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return 'މިހާރު';
	if (minutes < 60) return `${minutes} މިނެޓް ކުރިން`;
	if (hours < 24) return `${hours} ގަޑިއިރު ކުރިން`;
	if (days === 1) return 'އިއްޔެ';
	if (days < 7) return `${days} ދުވަސް ކުރިން`;
	if (days < 30) return `${Math.floor(days / 7)} ހަފްތާ ކުރިން`;
	return `${Math.floor(days / 30)} މަސް ކުރިން`;
}

// --- CRUD operations ---

export async function createSession(params: {
	id: string;
	model: string;
	messages: Message[];
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

export async function saveMessages(sessionId: string, messages: Message[]): Promise<void> {
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
	// Strip Blob URLs from artifact steps before serializing (they're not valid across sessions).
	// Strip inline image data to avoid bloating IndexedDB — keep only a count so the UI
	// can render a placeholder paperclip on restore.
	const cleaned = messages.map((m: any) => {
		const count = m.images?.length ?? m.imageCount;
		const { images: _omit, ...rest } = m;
		return {
			...rest,
			...(count ? { imageCount: count } : {}),
			steps: m.steps?.map((s: any) =>
				s.kind === 'artifact' ? { ...s, url: '' } : s
			)
		};
	});
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

export async function saveAgentFS(
	sessionId: string,
	files: Record<string, string>
): Promise<void> {
	await db.sessions.update(sessionId, {
		fsSnapshot: JSON.stringify(files),
		updatedAt: Date.now()
	});
}

export async function loadAgentFS(
	sessionId: string
): Promise<Record<string, string> | null> {
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
