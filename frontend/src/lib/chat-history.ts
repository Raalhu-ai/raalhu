import Dexie from 'dexie';
import { db, type ChatSession, type SerializedMessage } from '$lib/db';
import { fetchWithModelFallback } from '$lib/gemini-api';
import type { Message } from '@ai-sdk/svelte';
// --- Serialization helpers ---

const CHAT_HISTORY_EXPORT_TYPE = 'raalhu-chat-history';
const CHAT_HISTORY_EXPORT_VERSION = 1;

export interface ChatHistoryExport {
	type: typeof CHAT_HISTORY_EXPORT_TYPE;
	version: typeof CHAT_HISTORY_EXPORT_VERSION;
	exportedAt: string;
	sessions: ChatSession[];
}

export interface ChatHistoryImportResult {
	imported: number;
	updated: number;
	skipped: number;
	total: number;
}

type TranscriptMessage = {
	role: string;
	content: string;
	imageCount?: number;
	steps?: unknown[];
};

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

export async function listArchivedSessions(): Promise<ChatSession[]> {
	return db.sessions
		.where('[archived+updatedAt]')
		.between([1, Dexie.minKey], [1, Dexie.maxKey])
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

export async function restoreSession(id: string): Promise<void> {
	await db.sessions.update(id, { archived: 0, updatedAt: Date.now() });
}

export async function deleteSession(id: string): Promise<void> {
	await db.sessions.delete(id);
}

// --- Chat history import/export ---

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = Date.now()): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeSerializedMessages(value: unknown): SerializedMessage[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(isRecord)
		.map((message) => ({
			id: normalizeString(message.id, crypto.randomUUID()),
			role: normalizeString(message.role, 'user'),
			content: normalizeString(message.content),
			createdAt: typeof message.createdAt === 'string' ? message.createdAt : undefined,
			annotations: Array.isArray(message.annotations) ? message.annotations : undefined
		}));
}

function normalizeSession(value: unknown): ChatSession | null {
	if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) return null;

	const now = Date.now();
	const createdAt = normalizeNumber(value.createdAt, now);
	const updatedAt = normalizeNumber(value.updatedAt, createdAt);
	const archived = value.archived === 1 ? 1 : 0;

	return {
		id: value.id,
		title: normalizeString(value.title, 'ޗެޓް'),
		modeId: normalizeString(value.modeId, 'agent'),
		model: normalizeString(value.model, 'gemini-3-flash-preview'),
		messages: normalizeSerializedMessages(value.messages),
		body: isRecord(value.body) ? value.body : {},
		formData: isRecord(value.formData)
			? Object.fromEntries(
					Object.entries(value.formData).filter(
						(entry): entry is [string, string] => typeof entry[1] === 'string'
					)
				)
			: undefined,
		archived,
		createdAt,
		updatedAt,
		agentMessages: typeof value.agentMessages === 'string' ? value.agentMessages : undefined,
		agentContents: typeof value.agentContents === 'string' ? value.agentContents : undefined,
		fsSnapshot: typeof value.fsSnapshot === 'string' ? value.fsSnapshot : undefined,
		projectId: typeof value.projectId === 'string' ? value.projectId : undefined
	};
}

function assertChatHistoryExport(value: unknown): ChatHistoryExport {
	if (!isRecord(value)) throw new Error('Invalid chat history export');
	if (value.type !== CHAT_HISTORY_EXPORT_TYPE) throw new Error('Invalid chat history export type');
	if (value.version !== CHAT_HISTORY_EXPORT_VERSION) {
		throw new Error('Unsupported chat history export version');
	}
	if (!Array.isArray(value.sessions)) throw new Error('Invalid chat history sessions');

	const sessions = value.sessions.map(normalizeSession);
	if (sessions.some((session) => session === null)) {
		throw new Error('Invalid chat history session');
	}

	return {
		type: CHAT_HISTORY_EXPORT_TYPE,
		version: CHAT_HISTORY_EXPORT_VERSION,
		exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
		sessions: sessions as ChatSession[]
	};
}

export async function exportChatHistory(): Promise<ChatHistoryExport> {
	const sessions = await db.sessions.toArray();
	return {
		type: CHAT_HISTORY_EXPORT_TYPE,
		version: CHAT_HISTORY_EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		sessions: JSON.parse(JSON.stringify(sessions)) as ChatSession[]
	};
}

function formatExportDate(value: number | string | undefined): string {
	if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
	if (typeof value === 'string' && value.trim()) return value;
	return 'Unknown';
}

function normalizeTranscriptRole(role: string): string {
	if (role === 'user') return 'User';
	if (role === 'assistant') return 'Assistant';
	if (role === 'system') return 'System';
	return role || 'Message';
}

function getStepText(step: unknown, includeText = true): string {
	if (!isRecord(step) || typeof step.kind !== 'string') return '';
	if (step.kind === 'text' && typeof step.content === 'string') return includeText ? step.content : '';
	if (step.kind === 'artifact') {
		const label = normalizeString(step.label, 'Artifact');
		const filename = normalizeString(step.filename);
		return filename ? `[Artifact: ${label} (${filename})]` : `[Artifact: ${label}]`;
	}
	if (step.kind === 'message-compose' && isRecord(step.data)) {
		return `[Message draft: ${normalizeString(step.data.summaryTitle, 'Untitled')}]`;
	}
	if (step.kind === 'recipe-display' && isRecord(step.data)) {
		return `[Recipe: ${normalizeString(step.data.title, 'Untitled')}]`;
	}
	if (step.kind === 'show-widget' && isRecord(step.data)) {
		return `[Widget: ${normalizeString(step.data.title, 'Untitled')}]`;
	}
	return '';
}

function parseAgentMessages(session: ChatSession): TranscriptMessage[] | null {
	if (!session.agentMessages) return null;
	try {
		const messages = JSON.parse(session.agentMessages);
		if (!Array.isArray(messages)) return null;
		return messages
			.filter(isRecord)
			.map((message) => ({
				role: normalizeString(message.role, 'message'),
				content: normalizeString(message.content),
				imageCount: normalizeNumber(message.imageCount, 0),
				steps: Array.isArray(message.steps) ? message.steps : undefined
			}));
	} catch {
		return null;
	}
}

function getTranscriptMessages(session: ChatSession): TranscriptMessage[] {
	const agentMessages = parseAgentMessages(session);
	if (agentMessages) return agentMessages;
	return session.messages.map((message) => ({
		role: message.role,
		content: message.content
	}));
}

function formatTranscriptMessage(message: TranscriptMessage): string {
	const chunks = [message.content.trim()];
	const hasContent = Boolean(chunks[0]);
	const stepText = message.steps
		?.map((step) => getStepText(step, !hasContent))
		.filter(Boolean)
		.join('\n\n')
		.trim();
	if (!chunks[0] && stepText) chunks[0] = stepText;
	if (chunks[0] && stepText) chunks.push(stepText);
	if (message.imageCount && message.imageCount > 0) {
		chunks.push(`[Attached images: ${message.imageCount}]`);
	}
	return `### ${normalizeTranscriptRole(message.role)}\n${chunks.filter(Boolean).join('\n\n') || '[No text content]'}`;
}

export async function exportChatHistoryText(): Promise<string> {
	const sessions = (await db.sessions.toArray()).sort((a, b) => b.updatedAt - a.updatedAt);
	const exportedAt = new Date().toISOString();
	const lines = [
		'Raalhu Chat History',
		`Exported: ${exportedAt}`,
		`Sessions: ${sessions.length}`,
		''
	];

	for (const session of sessions) {
		const messages = getTranscriptMessages(session);
		lines.push(
			'---',
			'',
			`# ${session.title || 'Chat'}`,
			`ID: ${session.id}`,
			`Created: ${formatExportDate(session.createdAt)}`,
			`Updated: ${formatExportDate(session.updatedAt)}`,
			`Status: ${session.archived === 1 ? 'Archived' : 'Active'}`,
			`Model: ${session.model || 'Unknown'}`,
			...(session.projectId ? [`Project ID: ${session.projectId}`] : []),
			''
		);

		if (messages.length === 0) {
			lines.push('[No messages]', '');
			continue;
		}

		lines.push(messages.map(formatTranscriptMessage).join('\n\n'), '');
	}

	return `${lines.join('\n').trimEnd()}\n`;
}

export async function importChatHistory(payload: unknown): Promise<ChatHistoryImportResult> {
	const parsed = assertChatHistoryExport(payload);
	const result: ChatHistoryImportResult = {
		imported: 0,
		updated: 0,
		skipped: 0,
		total: parsed.sessions.length
	};

	await db.transaction('rw', db.sessions, async () => {
		for (const session of parsed.sessions) {
			const existing = await db.sessions.get(session.id);
			if (!existing) {
				await db.sessions.add(session);
				result.imported += 1;
				continue;
			}

			if (session.updatedAt > existing.updatedAt) {
				await db.sessions.put(session);
				result.updated += 1;
				continue;
			}

			result.skipped += 1;
		}
	});

	return result;
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
		const res = await fetchWithModelFallback('/api/title', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message })
		}, 'gemini-2.5-flash', fetch, { operation: 'title' });
		if (!res.ok) return '';
		const { title } = await res.json();
		return (title || '').trim();
	} catch {
		return '';
	}
}
