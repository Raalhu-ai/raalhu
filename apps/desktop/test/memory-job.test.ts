import { expect, test } from 'bun:test';
import { runMemoryJob } from '../src/renderer/memory-job';
import { EMPTY_MEMORY, MEMORY_COMPACTION_MS } from '../src/global-memory';
import type { GlobalMemoryState, StorageAPI } from '../src/storage/types';

function fixture() {
  const state: GlobalMemoryState = { content: EMPTY_MEMORY, entries: [], sources: {}, lastCompactedAt: 0 };
  let saves = 0;
  const db = {
    getGlobalMemory: async () => structuredClone(state),
    listSessions: async () => Array.from({ length: 6 }, (_, i) => ({ id: String(i), updatedAt: i, archived: 0, projectId: i === 5 ? 'project' : undefined })),
    messageRevision: async () => 1,
    loadMessages: async () => [
      { role: 'user', parts: [{ type: 'text', text: 'I prefer short replies.' }] },
      { role: 'assistant', parts: [{ type: 'text', text: 'Unconfirmed assistant claim' }, { type: 'dynamic-tool', output: 'Tool secret' }] },
    ],
    saveGlobalMemory: async (update: any) => {
      saves++;
      state.content = update.content;
      state.sources = update.sources;
      state.entries = [{ id: saves, content: update.content, createdAt: 100 }, ...state.entries].slice(0, 4);
      if (update.compacted || !state.lastCompactedAt) state.lastCompactedAt = 100;
    },
  } as unknown as StorageAPI;
  return { db, state, saves: () => saves };
}

test('extracts from latest four chats, excludes assistant/tool text and checkpoints unchanged chats', async () => {
  const { db, state, saves } = fixture();
  let input: any;
  const generate = async (value: string) => { input = JSON.parse(value); return 'User facts.\n\nShort replies preferred.'; };
  expect(await runMemoryJob(db, generate, { now: 100 })).toBe(true);
  expect(input.chats.map((c: any) => c.id)).toEqual(['5', '4', '3', '2']);
  expect(input.chats[0].projectChat).toBe(true);
  expect(JSON.stringify(input)).not.toContain('Unconfirmed');
  expect(JSON.stringify(input)).not.toContain('Tool secret');
  expect(state.content.split('\n\n')).toHaveLength(2);
  expect(await runMemoryJob(db, generate, { now: 101 })).toBe(false);
  expect(saves()).toBe(1);
});

test('four-day compaction runs without new chats and catches up after reopening', async () => {
  const { db, state } = fixture();
  await runMemoryJob(db, async () => 'Facts.\n\nPreferences.', { now: 100 });
  let calls = 0;
  const generate = async (value: string) => { calls++; expect(JSON.parse(value).compact).toBe(true); return 'Trimmed facts.\n\nTrimmed preferences.'; };
  expect(await runMemoryJob(db, generate, { now: 100 + MEMORY_COMPACTION_MS - 1 })).toBe(false);
  expect(await runMemoryJob(db, generate, { now: 100 + MEMORY_COMPACTION_MS })).toBe(true);
  expect(calls).toBe(1);
  expect(state.content).toContain('Trimmed');
});

test('active chats are deferred; failures, malformed output and cancellation preserve saved state', async () => {
  const { db, state, saves } = fixture();
  await runMemoryJob(db, async value => {
    expect(JSON.parse(value).chats.map((c: any) => c.id)).not.toContain('5');
    return 'Facts.\n\nPreferences.';
  }, { now: 100, activeChats: new Set(['5']) });
  expect(state.sources['5']).toBeUndefined();
  const previous = structuredClone(state);
  await expect(runMemoryJob(db, async () => 'Bad output', { now: 101 })).rejects.toThrow('two paragraphs');
  await expect(runMemoryJob(db, async () => { throw new Error('offline'); }, { now: 101 })).rejects.toThrow('offline');
  const abort = new AbortController();
  await expect(runMemoryJob(db, async () => { abort.abort(); return 'Facts.\n\nPreferences.'; }, { now: 101, signal: abort.signal })).rejects.toThrow();
  expect(state).toEqual(previous);
  expect(saves()).toBe(1);
});
