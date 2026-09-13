import { afterEach, expect, test } from 'bun:test';
import { getApiBase } from '../src/api-base';
import { fileURLToPath } from 'node:url';

const original = process.env.RAALHU_API_BASE;
afterEach(() => {
  if (original === undefined) delete process.env.RAALHU_API_BASE;
  else process.env.RAALHU_API_BASE = original;
});

test('local source defaults to the development backend and permits a self-hosted override', () => {
  delete process.env.RAALHU_API_BASE;
  expect(getApiBase()).toBe('http://127.0.0.1:3000');
  process.env.RAALHU_API_BASE = 'https://self-hosted.example.org/';
  expect(getApiBase()).toBe('https://self-hosted.example.org');
});

test('release embeds its backend without requiring a runtime environment variable', async () => {
  delete process.env.RAALHU_API_BASE;
  const result = await Bun.build({
    entrypoints: [fileURLToPath(new URL('../src/api-base.ts', import.meta.url))],
    target: 'node',
    define: { __RAALHU_RELEASE_API_BASE__: JSON.stringify('https://public.example.org/') },
  });
  expect(result.success).toBe(true);
  const module = await import(`data:text/javascript;base64,${Buffer.from(await result.outputs[0].text()).toString('base64')}`);
  expect(module.getApiBase()).toBe('https://public.example.org');
  process.env.RAALHU_API_BASE = 'https://personal.example.org';
  expect(module.getApiBase()).toBe('https://personal.example.org');
});
