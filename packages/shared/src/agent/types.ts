// Unified agent types shared across mobile, desktop, and extension

export interface UserInputQuestion {
	question: string;
	options: string[];
	type: 'single_select' | 'multi_select';
}

export interface MessageComposeVariant {
	label: string;
	body: string;
	subject?: string;
}

export interface MessageComposeData {
	kind: 'email' | 'textMessage' | 'other';
	summaryTitle: string;
	variants: MessageComposeVariant[];
}

export interface RecipeIngredient {
	id: string;
	name: string;
	amount: number;
	unit?: string;
}

export interface RecipeStep {
	id: string;
	title: string;
	content: string;
	timer_seconds?: number;
}

export interface RecipeData {
	title: string;
	ingredients: RecipeIngredient[];
	steps: RecipeStep[];
	base_servings?: number;
	description?: string;
	notes?: string;
}

export interface WidgetData {
	title: string;
	widget_code: string;
	mode: 'html' | 'svg';
}

export type AgentEvent =
	| { type: 'thinking'; content?: string }
	| { type: 'thinking-delta'; content: string }
	| { type: 'text-delta'; content: string }
	| { type: 'tool-call'; name: string; args: Record<string, unknown> }
	| { type: 'tool-result'; name: string; result: Record<string, unknown> }
	| { type: 'text'; content: string }
	| { type: 'ask-user-input'; questions: UserInputQuestion[] }
	| { type: 'message-compose'; data: MessageComposeData }
	| { type: 'recipe-display'; data: RecipeData }
	| { type: 'show-widget'; data: WidgetData }
	| { type: 'artifact'; uri: string; label: string; filename: string; mimeType: string }
	| { type: 'error'; message: string };

/** A single step in an assistant response — displayed sequentially */
export type AgentStep =
	| { kind: 'text'; content: string }
	| { kind: 'thinking'; content?: string }
	| { kind: 'tool-call'; name: string; args: Record<string, unknown>; status: 'running' | 'done' | 'error'; result?: Record<string, unknown> | string }
	| { kind: 'user-input'; questions: UserInputQuestion[]; selections: Record<number, string[]> }
	| { kind: 'message-compose'; data: MessageComposeData }
	| { kind: 'recipe-display'; data: RecipeData }
	| { kind: 'show-widget'; data: WidgetData }
	| { kind: 'artifact'; uri: string; label: string; filename: string; mimeType: string };

export interface AgentMessage {
	id: string;
	role: 'user' | 'assistant';
	/** Final text content (for serialization/title generation) */
	content: string;
	/** Sequential steps: text, tool calls in order */
	steps?: AgentStep[];
}

/** Gemini content format */
export interface GeminiContent {
	role: string;
	parts: Record<string, unknown>[];
}

/** Platform-agnostic sandbox interface */
export interface SandboxLike {
	execute(code: string): Promise<{ stdout: string; stderr: string; result: string }>;
	writeFile(path: string, content: string): Promise<void>;
	readFile(path: string): Promise<string>;
	listDir(path: string): Promise<string[]>;
	readFileBytes(path: string): Promise<Uint8Array>;
}

export interface ToolResult {
	response: Record<string, unknown>;
	artifact?: {
		uri: string;
		label: string;
		filename: string;
		mimeType: string;
	};
}

/** Platform-specific adapter for executor */
export interface PlatformAdapter {
	presentFile(sandbox: SandboxLike, path: string, label: string): Promise<ToolResult>;
	fetchApi(path: string, init: RequestInit): Promise<Response>;
}
