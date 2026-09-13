import { afterEach, expect, test } from 'bun:test';
import { configureAgent } from '../../../packages/shared/src/agent/retry';
import { GeminiChatTransport } from '../src/renderer/agent/gemini-transport';
import type { ModelRequest } from '../src/model-request-types';

const previousWindow = globalThis.window;
afterEach(() => { globalThis.window = previousWindow; });
const text = (value: string) => ({ candidates: [{ content: { parts: [{ text: value }] }, finishReason: 'STOP' }] });
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
async function scenario(first: string[], options: { proxy?: string[]; module?: string; unavailable?: boolean; status?: number; abort?: boolean; brokenRead?: boolean } = {}) {
  const requests: ModelRequest[] = [];
  const queues = new Map<string, string[]>();
  const notices: string[] = [];
  const controller = new AbortController();
  let cancelled = 0;
  globalThis.window = { platform: { modelRequests: {
    async start(request: ModelRequest) {
      requests.push(request);
      if (request.proxyFallback && options.unavailable) throw new Error('Proxy is unavailable');
      queues.set(request.id, [...(request.proxyFallback ? options.proxy ?? [frame(text('proxy answer')), 'data: [DONE]\n\n'] : first)]);
      return { status: request.proxyFallback ? 200 : options.status ?? 200, headers: { 'X-Resolved-Model-Module': request.proxyFallback ? 'proxy' : options.module ?? 'ai-sdk' } };
    },
    async read(id: string) {
      if (options.abort) controller.abort();
      if (options.brokenRead && requests.length === 1) throw new Error('connection lost');
      const value = queues.get(id)!.shift();
      return value === undefined ? { done: true } : { done: false, value: new TextEncoder().encode(value) };
    },
    async cancel() { cancelled++; },
  } } } as any;
  configureAgent({ apiBase: '', getAuthHeaders: () => ({ 'X-Session': 'session' }) });
  const transport = new GeminiChatTransport({ model: 'gemini-2.5-flash', systemInstruction: { role: 'system', parts: [{ text: 'instructions' }] }, onFallback: message => notices.push(message) });
  const stream = await transport.sendMessages({ trigger: 'submit-message', chatId: 'chat', messageId: undefined, abortSignal: controller.signal, messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'hello' }] }] });
  const chunks: any[] = [];
  const reader = stream.getReader();
  for (;;) { const item = await reader.read(); if (item.done) break; chunks.push(item.value); }
  return { requests, chunks, notices, cancelled };
}

for (const error of [{ error: 'BYOK failed' }, { response: { error: { message: 'BYOK failed' } } }]) {
  test('SSE errors without candidates fallback before output', async () => {
    const result = await scenario([frame({ usageMetadata: {} }), frame(error)]);
    expect(result.requests.length).toBe(2);
    expect(result.requests[1].proxyFallback).toBe(true);
    expect(result.requests[1].body).toBe(result.requests[0].body);
    expect(result.requests[1].session).toBe('session');
    expect(result.chunks.some(chunk => chunk.type === 'error')).toBe(false);
    expect(result.chunks.some(chunk => chunk.delta === 'proxy answer')).toBe(true);
    expect(result.notices.length).toBe(1);
  });
}
for (const part of [{ text: 'partial' }, { text: 'thinking', thought: true }, { functionCall: { name: 'do_something', args: {} } }]) {
  test(`never replays after ${JSON.stringify(part)}`, async () => {
    const result = await scenario([frame({ candidates: [{ content: { parts: [part] } }] }), frame({ error: 'late failure' })]);
    expect(result.requests.length).toBe(1);
    expect(result.chunks.at(-1)).toMatchObject({ type: 'error', errorText: 'late failure' });
    expect(result.chunks.some(chunk => chunk.type === 'finish')).toBe(false);
    expect(result.notices.length).toBe(0);
  });
}
test('unavailable proxy surfaces failure without a replay loop', async () => {
  const result = await scenario([frame({ error: 'BYOK failed' })], { unavailable: true });
  expect(result.requests.length).toBe(2);
  expect(result.chunks.at(-1).errorText).toContain('Proxy fallback could not start');
});
test('proxy stream failure does not retry again', async () => {
  const result = await scenario([frame({ error: 'BYOK failed' })], { proxy: [frame({ error: 'proxy failed' })] });
  expect(result.requests.length).toBe(2);
  expect(result.chunks.at(-1).errorText).toBe('proxy failed');
});
test('a proxy-selected stream never falls back to itself', async () => {
  const result = await scenario([frame({ error: 'proxy failed' })], { module: 'proxy' });
  expect(result.requests.length).toBe(1);
  expect(result.chunks.at(-1).type).toBe('error');
});
test('HTTP BYOK failure switches without waiting through BYOK retry backoff', async () => {
  const result = await scenario(['{"error":"unavailable"}'], { status: 502 });
  expect(result.requests.length).toBe(2);
  expect(result.chunks.some(chunk => chunk.delta === 'proxy answer')).toBe(true);
});
test('broken reads before output can fallback', async () => {
  const result = await scenario([], { brokenRead: true });
  expect(result.requests.length).toBe(2);
  expect(result.chunks.some(chunk => chunk.delta === 'proxy answer')).toBe(true);
});
test('cancellation never triggers fallback', async () => {
  const result = await scenario([frame({ error: 'cancelled' })], { abort: true });
  expect(result.requests.length).toBe(1);
  expect(result.notices.length).toBe(0);
});
test('authentication errors and model safety blocks do not fallback', async () => {
  const auth = await scenario(['{"error":"login required"}'], { status: 401 });
  expect(auth.requests.length).toBe(1);
  const blocked = await scenario([frame({ promptFeedback: { blockReason: 'SAFETY' } })]);
  expect(blocked.requests.length).toBe(1);
});

for (const failureKind of ['credentials', 'quota', 'network', 'model-access']) {
  test(`late ${failureKind} failure shows category-specific guidance without replay`, async () => {
    const { byokFailureMessages } = await import('../src/byok-failure');
    const result = await scenario([frame(text('partial')), frame({ error: 'private provider text', failureKind })]);
    expect(result.requests.length).toBe(1);
    expect(result.chunks.at(-1).errorText).toBe(byokFailureMessages[failureKind as keyof typeof byokFailureMessages]);
  });
}
for (const status of [200, 502]) {
  test(`server cancellation (${status}) never falls back`, async () => {
    const failure = { error: 'cancelled', failureKind: 'cancelled' };
    if (status === 502) {
      await expect(scenario([JSON.stringify(failure)], { status })).rejects.toThrow('cancelled');
      return;
    }
    const result = await scenario([frame(failure)], { status });
    expect(result.requests.length).toBe(1);
    expect(result.chunks.at(-1).errorText).toContain('cancelled');
  });
}
