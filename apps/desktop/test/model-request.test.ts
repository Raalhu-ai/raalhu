import { afterEach, expect, test } from 'bun:test';
import { configureAgent } from '../../../packages/shared/src/agent/retry';
import { createModelFetcher, fetchModelRequest } from '../src/renderer/model-request';
import { GeminiChatTransport } from '../src/renderer/agent/gemini-transport';
import type { ModelRequestsAPI } from '../src/model-request-types';

const originalWindow = globalThis.window;
afterEach(() => { globalThis.window = originalWindow; });
function install(api: ModelRequestsAPI) {
  globalThis.window = { platform: { modelRequests: api } } as any;
  configureAgent({ apiBase: 'http://127.0.0.1:3000', getAuthHeaders: () => ({ 'X-Session': 'session-token' }) });
}

test('chat and title requests preserve session and expose streamed response chunks', async () => {
  for (const endpoint of ['/api/stream', '/api/generate'] as const) {
    let reads = 0;
    install({
      async start(request) {
        expect(request.endpoint).toBe(endpoint);
        expect(request.session).toBe('session-token');
        expect(request.body).toBe('{"model":"gemini-2.5-flash","contents":[]}');
        return { status: 200, headers: { 'X-Resolved-Model-Module': 'ai-sdk' } };
      },
      async read() { return ++reads === 1 ? { done: false, value: new TextEncoder().encode('first') } : { done: true }; },
      async cancel() {},
    });
    const response = await fetchModelRequest(endpoint, { method: 'POST', body: '{"model":"gemini-2.5-flash","contents":[]}' });
    expect(response.headers.get('x-resolved-model-module')).toBe('ai-sdk');
    expect(await response.text()).toBe('first');
  }
});

test('session reauthentication callback still runs for model requests', async () => {
  let reauth = false;
  let read = false;
  install({
    async start() { return { status: 401, headers: {} }; },
    async read() { if (read) return { done: true }; read = true; return { done: false, value: new TextEncoder().encode('{"code":"REAUTH_REQUIRED"}') }; },
    async cancel() {},
  });
  configureAgent({ apiBase: '', getAuthHeaders: () => ({ 'X-Session': 'expired' }), onReauthRequired: () => { reauth = true; } });
  const response = await fetchModelRequest('/api/generate', { method: 'POST', body: '{}' });
  expect(response.status).toBe(401);
  expect(reauth).toBe(true);
});

test('abort before headers cancels the main-process request immediately', async () => {
  let cancelled = false;
  install({ start: () => new Promise(() => {}), read: async () => ({ done: true }), cancel: async () => { cancelled = true; } });
  const controller = new AbortController();
  const pending = createModelFetcher('/api/stream')('', { method: 'POST', body: '{}', signal: controller.signal }).catch(error => error);
  controller.abort();
  expect((await pending).name).toBe('AbortError');
  expect(cancelled).toBe(true);
});

test('abort during streaming cancels remote reading and errors the local stream', async () => {
  let cancelled = false;
  let release!: () => void;
  install({
    start: async () => ({ status: 200, headers: {} }),
    read: () => new Promise(resolve => { release = () => resolve({ done: true }); }),
    cancel: async () => { cancelled = true; release?.(); },
  });
  const controller = new AbortController();
  const response = await createModelFetcher('/api/stream')('', { method: 'POST', body: '{}', signal: controller.signal });
  const pending = response.body!.getReader().read().catch(error => error);
  controller.abort();
  expect((await pending).name).toBe('AbortError');
  expect(cancelled).toBe(true);
});

test('chat transport retains tools, memories, and tool responses across requests', async () => {
  let count = 0;
  let read = false;
  install({
    async start(request) {
      const body = JSON.parse(request.body);
      expect(body.tools.length).toBeGreaterThan(0);
      expect(body.memories).toEqual({ user: 'remember me' });
      if (count === 1) expect(body.contents.some((turn: any) => turn.parts.some((part: any) => part.functionResponse))).toBe(true);
      read = false;
      count++;
      return { status: 200, headers: {} };
    },
    async read() {
      if (read) return { done: true };
      read = true;
      const parts = count === 1 ? [{ functionCall: { name: 'test_tool', args: { value: 1 } } }] : [{ text: 'done' }];
      return { done: false, value: new TextEncoder().encode(`data: ${JSON.stringify({ candidates: [{ content: { parts }, finishReason: 'STOP' }] })}\n\ndata: [DONE]\n\n`) };
    },
    async cancel() {},
  });
  const transport = new GeminiChatTransport({ model: 'gemini-2.5-flash', systemInstruction: { role: 'system', parts: [{ text: 'instructions' }] }, resolveMemories: async () => ({ user: 'remember me' }) as any });
  const user = { id: 'user', role: 'user', parts: [{ type: 'text', text: 'hello' }] };
  const options = { trigger: 'submit-message', chatId: 'chat', messageId: undefined, abortSignal: undefined } as const;
  const first = await transport.sendMessages({ ...options, messages: [user] as any });
  const collect = async (stream: ReadableStream) => { const values = []; const reader = stream.getReader(); for (;;) { const chunk = await reader.read(); if (chunk.done) return values; values.push(chunk.value); } };
  expect((await collect(first)).some(part => part.type === 'tool-input-available')).toBe(true);
  const second = await transport.sendMessages({ ...options, messages: [user, { id: 'assistant', role: 'assistant', parts: [{ type: 'dynamic-tool', toolName: 'test_tool', input: { value: 1 }, state: 'output-available', output: { success: true } }] }] as any });
  expect((await collect(second)).some(part => part.type === 'text-delta' && part.delta === 'done')).toBe(true);
});

test('cancelling during retry backoff does not send another request', async () => {
  const { fetchWithRetry } = await import('../../../packages/shared/src/agent/retry');
  const controller = new AbortController();
  let attempts = 0;
  const pending = fetchWithRetry('/api/stream', { signal: controller.signal }, (async () => {
    attempts++;
    setTimeout(() => controller.abort(), 10);
    return Response.json({ error: 'busy' }, { status: 503 });
  }) as typeof fetch).catch(error => error);
  expect((await pending).name).toBe('AbortError');
  expect(attempts).toBe(1);
});
