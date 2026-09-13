import { expect, test } from 'bun:test';
import { generateModel, streamModel, toModelMessages, type GeminiRequestBody } from '../src/model-providers';

const contents: GeminiRequestBody['contents'] = [
  { role: 'user', parts: [{ text: 'Run both calculations' }] },
  { role: 'model', parts: [
    { text: 'I will calculate both.' },
    { functionCall: { name: 'run_code', args: { code: '1+1' } } },
    { functionCall: { name: 'run_code', args: { code: '2+2' } } },
  ] },
  { role: 'user', parts: [
    { functionResponse: { name: 'run_code', response: { result: 2 } } },
    { functionResponse: { name: 'run_code', response: { error: 'execution failed', retryable: true } } },
    { text: 'Retry the second calculation.' },
  ] },
  { role: 'model', parts: [{ functionCall: { name: 'run_code', args: { code: '2+2' } } }] },
  { role: 'user', parts: [{ functionResponse: { name: 'run_code', response: { result: 4 } } }] },
];

for (const streaming of [false, true]) {
  test(`${streaming ? 'stream' : 'generate'} sends structured tool history to Google`, async () => {
    const previous = globalThis.fetch;
    let upstream: any;
    globalThis.fetch = (async (_url, init) => {
      upstream = JSON.parse(init!.body as string);
      const result = { candidates: [{ content: { role: 'model', parts: [{ text: 'Done' }] }, finishReason: 'STOP' }] };
      return streaming
        ? new Response(`data: ${JSON.stringify(result)}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })
        : Response.json(result);
    }) as typeof fetch;
    try {
      const response = await (streaming ? streamModel : generateModel)(
        { module: 'ai-sdk', provider: 'google', apiKey: 'mock-key' },
        { model: 'gemini-2.5-flash',
          // Desktop can serialize parallel calls as adjacent model messages.
          contents: streaming ? contents.flatMap(c => c.role === 'model'
            ? c.parts.map(part => ({ role: 'model', parts: [part] })) : [c]) : contents, tools: [{ functionDeclarations: [{
          name: 'run_code', description: 'Run code', parameters: { type: 'OBJECT', properties: { code: { type: 'STRING' } }, required: ['code'] },
        }] }] }, {} as any, {} as any,
      );
      expect(response.ok).toBe(true);
      expect(await response.text()).toContain('Done');
      const parts = upstream.contents.flatMap((c: any) => c.parts);
      const calls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
      const results = parts.filter((p: any) => p.functionResponse).map((p: any) => p.functionResponse);
      expect(calls.map((c: any) => c.args)).toEqual([{ code: '1+1' }, { code: '2+2' }, { code: '2+2' }]);
      expect(new Set(calls.map((c: any) => c.id)).size).toBe(3);
      expect(results.map((r: any) => r.id)).toEqual(calls.map((c: any) => c.id));
      // Google's SDK wraps JSON outputs in { name, content }; the value stays structured.
      expect(results.map((r: any) => r.response.content)).toEqual([{ result: 2 }, { error: 'execution failed', retryable: true }, { result: 4 }]);
      expect(parts.filter((p: any) => p.text).map((p: any) => p.text)).toEqual([
        'Run both calculations', 'I will calculate both.', 'Retry the second calculation.',
      ]);
      expect(upstream.tools[0].functionDeclarations[0].name).toBe('run_code');
    } finally { globalThis.fetch = previous; }
  });
}

test('explicit IDs correlate out-of-order results for the same tool', () => {
  const messages = toModelMessages([
    { role: 'model', parts: ['a', 'b'].map(id => ({ functionCall: { id, name: 'run_code', args: { id } } })) },
    { role: 'user', parts: ['b', 'a'].map(id => ({ functionResponse: { id, name: 'run_code', response: { id } } })) },
  ]);
  expect((messages[1].content as any[]).map(p => p.toolCallId)).toEqual(['b', 'a']);
});

test('generated IDs do not collide with explicit IDs', () => {
  const messages = toModelMessages([{ role: 'model', parts: [
    { functionCall: { name: 'first', args: {} } },
    { functionCall: { id: 'gemini-call-0', name: 'second', args: {} } },
  ] }]);
  expect((messages[0].content as any[]).map(p => p.toolCallId)).toEqual(['gemini-call-1', 'gemini-call-0']);
});

test('unmatched results fail instead of silently becoming user text', () => {
  expect(() => toModelMessages([{ role: 'user', parts: [{ functionResponse: { name: 'missing', response: {} } }] }])).toThrow('no matching function call');
});

test('reasoning, signatures, and text remain distinct', () => {
  expect(toModelMessages([{ role: 'model', parts: [
    { text: 'Reasoning', thought: true, thoughtSignature: 'reason-signature' },
    { text: 'Visible text' },
    { functionCall: { name: 'run_code', args: {} }, thoughtSignature: 'call-signature' },
  ] }])[0].content).toMatchObject([
    { type: 'reasoning', text: 'Reasoning', providerOptions: { google: { thoughtSignature: 'reason-signature' } } },
    { type: 'text', text: 'Visible text' },
    { type: 'tool-call', toolName: 'run_code', providerOptions: { google: { thoughtSignature: 'call-signature' } } },
  ]);
});

test('plain title requests retain their text', () => {
  expect(toModelMessages([{ role: 'user', parts: [{ text: 'Generate a title' }] }])).toEqual([
    { role: 'user', content: [{ type: 'text', text: 'Generate a title' }] },
  ]);
});
