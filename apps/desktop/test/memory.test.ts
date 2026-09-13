import { afterEach, beforeEach, expect, test } from 'bun:test';
import { loadSettings, saveSettings } from '../src/renderer/settings';
import { loadChatMemories } from '../src/renderer/memory';
import { updateProjectMemory } from '../src/renderer/storage';
import { GeminiChatTransport } from '../src/renderer/agent/gemini-transport';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalFetch = globalThis.fetch;
let globalMemory = "Global facts.\n\nGlobal preferences.";
let projects: Map<string, { name: string; memory: string }>;

beforeEach(() => {
  const values = new Map<string, string>();
  projects = new Map([
    ['a', { name: 'Project A', memory: ' A notes ' }],
    ['b', { name: 'Project B', memory: 'B notes' }],
  ]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { platform: { storage: {
    getGlobalMemory: async () => ({ content: globalMemory }),
    listSessions: async () => [{ id: 'chat-a', projectId: 'a' }, { id: 'chat-b', projectId: 'b' }, { id: 'plain' }],
    getProject: async (id: string) => projects.get(id),
    updateProject: async (id: string, patch: { memory: string }) => Object.assign(projects.get(id)!, patch),
  } } } });
});

afterEach(() => {
  for (const [key, descriptor] of [['window', originalWindow], ['localStorage', originalStorage]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  globalThis.fetch = originalFetch;
});

test('older settings default to empty memory; saved global memory survives reload', () => {
  localStorage.setItem('mogger_settings', JSON.stringify({ theme: 'light' }));
  expect(loadSettings().memories).toBe('');
  saveSettings({ ...loadSettings(), memories: 'Global notes' });
  expect(loadSettings()).toMatchObject({ theme: 'light', memories: 'Global notes' });
});

test('reopened conversations resolve only their own project and current saved notes', async () => {
  saveSettings({ ...loadSettings(), memories: ' Global notes ' });
  expect(await loadChatMemories('chat-a')).toEqual({ global: globalMemory, project: 'A notes', projectName: 'Project A' });
  expect(await loadChatMemories('chat-b')).toMatchObject({ project: 'B notes' });
  expect(await loadChatMemories('plain')).toEqual({ global: globalMemory });
  await updateProjectMemory('a', 'Updated');
  expect(await loadChatMemories('chat-a')).toMatchObject({ project: 'Updated' });
  projects.delete('a');
  expect(await loadChatMemories('chat-a')).toEqual({ global: globalMemory });
});

test('transport refreshes memory for sends, regeneration and tool continuations, omitting cleared notes', async () => {
  const bodies: any[] = [];
  let route = "proxy";
  const delivered = new Set<string>();
  (window.platform as any).modelRequests = {
    start: async (request: any) => {
      bodies.push({ ...JSON.parse(request.body), route });
      return { status: 200, headers: { "X-Resolved-Model-Module": route } };
    },
    read: async (id: string) => {
      if (delivered.has(id)) return { done: true };
      delivered.add(id);
      return { done: false, value: new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"finishReason":"STOP"}]}\n\ndata: [DONE]\n') };
    },
    cancel: async () => {},
  };
  const transport = new GeminiChatTransport({
    model: 'test', systemInstruction: { role: 'user', parts: [{ text: 'Base prompt' }] },
    resolveMemories: () => loadChatMemories('chat-a'),
  });
  const send = async (trigger: 'submit-message' | 'regenerate-message', messages: any[] = []) => {
    const stream = await transport.sendMessages({ trigger, chatId: 'chat-a', messageId: undefined, messages, abortSignal: undefined });
    const reader = stream.getReader();
    while (!(await reader.read()).done) {}
  };
  await send('submit-message');
  await updateProjectMemory('a', 'Revised');
  route = 'ai-sdk';
  await send('regenerate-message');
  await send('submit-message', [{ id: 'tool', role: 'assistant', parts: [{ type: 'dynamic-tool', toolName: 'read_file', input: {}, state: 'output-available', output: { success: true } }] }]);
  await updateProjectMemory('a', '  ');
  await send('submit-message');
  expect(bodies.map(body => body.memories?.project)).toEqual(['A notes', 'Revised', 'Revised', undefined]);
  expect(bodies[2].contents[1].parts[0].functionResponse.name).toBe('read_file');
  expect(bodies.every(body => body.memories.global === globalMemory)).toBe(true);
  expect(bodies.map(body => body.route)).toEqual(['proxy', 'ai-sdk', 'ai-sdk', 'ai-sdk']);
  expect(bodies[0].systemInstruction.parts[0].text).toBe('Base prompt');
});
