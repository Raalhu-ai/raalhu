import { GoogleGenAI } from '@google/genai';

type GeminiRequestBody = {
	model?: string;
	contents: unknown;
	generationConfig?: Record<string, unknown>;
	tools?: unknown;
	systemInstruction?: unknown;
	toolConfig?: unknown;
};

function buildGenerateParams(body: GeminiRequestBody) {
	const {
		model = 'gemini-3-flash-preview',
		contents,
		generationConfig,
		tools,
		systemInstruction,
		toolConfig
	} = body;

	const config: Record<string, unknown> = {
		...(generationConfig ?? { maxOutputTokens: 8192 })
	};

	if (systemInstruction) config.systemInstruction = systemInstruction;
	if (tools) config.tools = tools;
	if (toolConfig) config.toolConfig = toolConfig;

	return {
		model,
		contents: contents as any,
		config: config as any
	};
}

export async function generateWithGeminiApi(apiKey: string, body: GeminiRequestBody) {
	const ai = new GoogleGenAI({ apiKey });
	return ai.models.generateContent(buildGenerateParams(body));
}

export async function streamWithGeminiApi(apiKey: string, body: GeminiRequestBody): Promise<ReadableStream> {
	const encoder = new TextEncoder();
	const ai = new GoogleGenAI({ apiKey });
	const stream = await ai.models.generateContentStream(buildGenerateParams(body));

	return new ReadableStream({
		async start(controller) {
			try {
				for await (const chunk of stream) {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
				}

				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			}
		}
	});
}
