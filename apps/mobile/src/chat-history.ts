import { getDb } from './db';
import { API_BASE, getAuthHeaders } from './api';
import type { AgentMessage, GeminiContent } from './agent/types';

export interface ChatSessionRow {
	id: string;
	title: string;
	modeId: string;
	model: string;
	messages: string;
	archived: number;
	createdAt: number;
	updatedAt: number;
	agentMessages: string | null;
	agentContents: string | null;
	projectId: string | null;
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

export function createSession(id: string, model: string, title?: string, projectId?: string): void {
	const now = Date.now();
	const db = getDb();
	db.runSync(
		`INSERT INTO sessions (id, title, modeId, model, messages, archived, createdAt, updatedAt, projectId) VALUES (?, ?, 'agent', ?, '[]', 0, ?, ?, ?)`,
		[id, title || '\u0797\u07AC\u0793\u07B0', model, now, now, projectId || null]
	);
}

export function listSessions(): ChatSessionRow[] {
	const db = getDb();
	return db.getAllSync<ChatSessionRow>(
		`SELECT * FROM sessions WHERE archived = 0 ORDER BY updatedAt DESC`
	);
}

export function getSession(id: string): ChatSessionRow | null {
	const db = getDb();
	return db.getFirstSync<ChatSessionRow>(`SELECT * FROM sessions WHERE id = ?`, [id]) || null;
}

export function renameSession(id: string, newTitle: string): void {
	const db = getDb();
	db.runSync(`UPDATE sessions SET title = ?, updatedAt = ? WHERE id = ?`, [newTitle, Date.now(), id]);
}

export function archiveSession(id: string): void {
	const db = getDb();
	db.runSync(`UPDATE sessions SET archived = 1, updatedAt = ? WHERE id = ?`, [Date.now(), id]);
}

export function deleteSession(id: string): void {
	const db = getDb();
	db.runSync(`DELETE FROM sessions WHERE id = ?`, [id]);
}

export function clearAllSessions(): void {
	const db = getDb();
	db.runSync(`DELETE FROM sessions`);
}

// --- Agent mode persistence ---

export function saveAgentMessages(sessionId: string, messages: AgentMessage[]): void {
	const cleaned = messages.map((m) => ({
		...m,
		steps: m.steps?.map((s) =>
			s.kind === 'tool-call' ? { ...s, result: typeof s.result === 'string' ? s.result : s.result ? JSON.stringify(s.result).slice(0, 500) : undefined } : s
		)
	}));
	const db = getDb();
	db.runSync(
		`UPDATE sessions SET agentMessages = ?, updatedAt = ? WHERE id = ?`,
		[JSON.stringify(cleaned), Date.now(), sessionId]
	);
}

export function loadAgentMessages(sessionId: string): AgentMessage[] | null {
	const session = getSession(sessionId);
	if (!session?.agentMessages) return null;
	try {
		return JSON.parse(session.agentMessages);
	} catch {
		return null;
	}
}

export function saveAgentContents(sessionId: string, contents: GeminiContent[]): void {
	const db = getDb();
	db.runSync(
		`UPDATE sessions SET agentContents = ?, updatedAt = ? WHERE id = ?`,
		[JSON.stringify(contents), Date.now(), sessionId]
	);
}

export function loadAgentContents(sessionId: string): GeminiContent[] | null {
	const session = getSession(sessionId);
	if (!session?.agentContents) return null;
	try {
		return JSON.parse(session.agentContents);
	} catch {
		return null;
	}
}

export function updateSessionTitle(sessionId: string, title: string): void {
	renameSession(sessionId, title);
}

// --- AI title generation ---

export async function fetchAITitle(message: string): Promise<string> {
	try {
		const headers = await getAuthHeaders();
		const res = await fetch(`${API_BASE}/api/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...headers },
			body: JSON.stringify({
				model: 'gemini-3-flash-preview',
				contents: [{
					role: 'user',
					parts: [{
						text: `Generate a very short title (max 6 words, in Dhivehi/Thaana script) for a conversation that starts with this message. Return ONLY the title, nothing else:\n\n${message.slice(0, 500)}`
					}]
				}],
				generationConfig: { maxOutputTokens: 50 }
			})
		});
		if (!res.ok) return '';
		const data = await res.json();
		const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
		const text = candidate?.content?.parts?.[0]?.text || '';
		return text.trim();
	} catch {
		return '';
	}
}
