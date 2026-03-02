import { getPromptModule } from './prompts';

export interface ToolConfig {
	tools?: Record<string, unknown>[];
	toolConfig?: Record<string, unknown>;
}

export interface SystemInstruction {
	role: string;
	parts: [{ text: string }];
}

/**
 * Returns Gemini tool declarations for a given mode.
 */
export function getToolsForMode(modeId: string): ToolConfig {
	switch (modeId) {
		case 'generate':
			return {
				tools: [
					{
						functionDeclarations: [
							{
								name: 'get_document_template',
								description:
									'Retrieves formatting instructions and template for a specific Dhivehi document type. MUST be called before generating any document.',
								parameters: {
									type: 'OBJECT',
									properties: {
										document_type: {
											type: 'STRING',
											description: 'The type of document to generate',
											enum: [
												'letter',
												'news',
												'essay',
												'agreement',
												'story',
												'speech',
												'poem',
												'raivaru',
												'proposal',
												'other'
											]
										}
									},
									required: ['document_type']
								}
							}
						]
					}
				],
				toolConfig: {
					functionCallingConfig: { mode: 'ANY' }
				}
			};
		case 'research':
		case 'web_search':
			return {
				tools: [{ googleSearch: {} }]
			};
		case 'agent':
			// Agent tools are handled client-side in the agent loop
			return {};
		default:
			return {};
	}
}

/**
 * Returns Gemini systemInstruction for a given mode.
 * Includes `role: "user"` as required by Code Assist API.
 */
export function getSystemInstruction(
	modeId: string,
	_formData?: Record<string, string>
): SystemInstruction {
	const prompt = getPromptModule();
	return {
		role: 'user',
		parts: [{ text: prompt.getSystemPrompt(_formData) }]
	};
}
