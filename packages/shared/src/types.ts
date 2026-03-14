export type AppState = 'loading' | 'login' | 'setup' | 'dashboard' | 'chat';

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
	agentMessages?: string;
	agentContents?: string;
	fsSnapshot?: string;
	projectId?: string;
}

export interface ProjectFile {
	id: string;
	name: string;
	mimeType: string;
	size: number;
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

export interface InspirationCard {
	id: string;
	title: string;
	category: string;
	bg: string;
	description: string;
	prompt: string;
}

export interface Settings {
	theme: 'light' | 'dark' | 'system';
	fontSize: 'small' | 'medium' | 'large';
	customInstructions: string;
}

export type VoiceState = 'idle' | 'recording' | 'transcribing';
