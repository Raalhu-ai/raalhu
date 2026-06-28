import { describe, expect, test } from 'bun:test';
import { asSchema } from 'ai';
import { AGENT_TOOLS } from '../../frontend/src/lib/agent/tools';
import {
	geminiFunctionParametersToAiSdkInputSchema,
	normalizeGeminiFunctionSchemaForAiSdk
} from '../src/model-providers';

const GEMINI_SCHEMA_TYPES = new Set(['OBJECT', 'STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'ARRAY', 'NULL']);

function collectGeminiStyleTypes(schema: unknown): string[] {
	if (Array.isArray(schema)) {
		return schema.flatMap((item) => collectGeminiStyleTypes(item));
	}
	if (!schema || typeof schema !== 'object') return [];

	const source = schema as Record<string, unknown>;
	const matches: string[] = [];
	const type = source.type;
	if (typeof type === 'string' && GEMINI_SCHEMA_TYPES.has(type)) {
		matches.push(type);
	} else if (Array.isArray(type)) {
		for (const item of type) {
			if (typeof item === 'string' && GEMINI_SCHEMA_TYPES.has(item)) matches.push(item);
		}
	}

	for (const value of Object.values(source)) {
		matches.push(...collectGeminiStyleTypes(value));
	}

	return matches;
}

const agentFunctionDeclarations = AGENT_TOOLS.flatMap((tool) => tool.functionDeclarations || []);

describe('normalizeGeminiFunctionSchemaForAiSdk', () => {
	test('normalizes every current agent tool declaration recursively', () => {
		expect(agentFunctionDeclarations.length).toBeGreaterThan(0);
		expect(
			agentFunctionDeclarations.some((declaration) =>
				collectGeminiStyleTypes(declaration.parameters).length > 0
			)
		).toBe(true);

		for (const declaration of agentFunctionDeclarations) {
			const normalized = normalizeGeminiFunctionSchemaForAiSdk(declaration.parameters);

			expect(normalized.type).toBe('object');
			expect(normalized.required).toEqual(declaration.parameters.required);
			expect(collectGeminiStyleTypes(normalized)).toEqual([]);
		}
	});

	test('normalizes read_skill schema types and preserves enum and required fields', () => {
		const schema = normalizeGeminiFunctionSchemaForAiSdk({
			type: 'OBJECT',
			properties: {
				name: {
					type: 'STRING',
					description: 'The skill name to load',
					enum: ['docx', 'pdf']
				}
			},
			required: ['name']
		});

		expect(schema).toEqual({
			type: 'object',
			properties: {
				name: {
					type: 'string',
					description: 'The skill name to load',
					enum: ['docx', 'pdf']
				}
			},
			required: ['name']
		});
	});

	test('wraps normalized schemas for AI SDK tool inputSchema consumption', async () => {
		const inputSchema = geminiFunctionParametersToAiSdkInputSchema({
			type: 'OBJECT',
			properties: {
				name: {
					type: 'STRING',
					enum: ['docx', 'pdf']
				}
			},
			required: ['name']
		});

		await expect(Promise.resolve(asSchema(inputSchema).jsonSchema)).resolves.toEqual({
			type: 'object',
			properties: {
				name: {
					type: 'string',
					enum: ['docx', 'pdf']
				}
			},
			required: ['name']
		});
	});

	test('normalizes nested arrays, object items, enums, and required fields', () => {
		const schema = normalizeGeminiFunctionSchemaForAiSdk({
			type: 'OBJECT',
			properties: {
				title: { type: 'STRING' },
				ingredients: {
					type: 'ARRAY',
					items: {
						type: 'OBJECT',
						properties: {
							id: { type: 'STRING' },
							amount: { type: 'NUMBER', minimum: 0 },
							unit: {
								type: 'STRING',
								enum: ['g', 'kg', 'cup']
							}
						},
						required: ['id', 'amount']
					}
				}
			},
			required: ['title', 'ingredients']
		});

		expect(schema).toEqual({
			type: 'object',
			properties: {
				title: { type: 'string' },
				ingredients: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							amount: { type: 'number', minimum: 0 },
							unit: {
								type: 'string',
								enum: ['g', 'kg', 'cup']
							}
						},
						required: ['id', 'amount']
					}
				}
			},
			required: ['title', 'ingredients']
		});
	});

	test('normalizes union type arrays and composition schemas', () => {
		const schema = normalizeGeminiFunctionSchemaForAiSdk({
			type: ['STRING', 'NULL'],
			anyOf: [{ type: 'STRING' }, { type: 'NUMBER' }],
			oneOf: [{ type: 'BOOLEAN' }],
			allOf: [{ type: 'OBJECT', properties: { value: { type: 'INTEGER' } } }]
		});

		expect(schema).toEqual({
			type: ['string', 'null'],
			anyOf: [{ type: 'string' }, { type: 'number' }],
			oneOf: [{ type: 'boolean' }],
			allOf: [{ type: 'object', properties: { value: { type: 'integer' } } }]
		});
	});

	test('passes lowercase JSON Schema through unchanged', () => {
		const schema = {
			type: 'object',
			properties: {
				value: {
					type: 'string',
					format: 'uri',
					minLength: 1
				}
			},
			required: ['value']
		};

		expect(normalizeGeminiFunctionSchemaForAiSdk(schema)).toEqual(schema);
	});

	test('falls back for missing or invalid parameters', () => {
		expect(normalizeGeminiFunctionSchemaForAiSdk(undefined)).toEqual({
			type: 'object',
			properties: {}
		});
		expect(normalizeGeminiFunctionSchemaForAiSdk('invalid')).toEqual({
			type: 'object',
			properties: {}
		});
	});
});
