import { describe, expect, test } from 'bun:test';
import { normalizeGeminiFunctionSchemaForAiSdk } from '../src/model-providers';

describe('normalizeGeminiFunctionSchemaForAiSdk', () => {
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
