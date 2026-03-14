// Re-export all types from shared agent module
export type {
	UserInputQuestion,
	MessageComposeVariant,
	MessageComposeData,
	RecipeIngredient,
	RecipeStep,
	RecipeData,
	WidgetData,
	AgentEvent,
	AgentStep,
	AgentMessage,
	GeminiContent,
	SandboxLike,
	ToolResult,
	PlatformAdapter,
} from '@raalhu/shared/src/agent';

/** Desktop-specific: standalone artifact reference (used in gallery/components) */
export interface Artifact {
	url: string;
	label: string;
	filename: string;
	mimeType: string;
}
