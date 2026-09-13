import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prepareProviderSession, isByokReady, providerModels, compatibleModel, BYOK_MODELS } from '../src/renderer/provider-session';
import Sidebar from '../src/renderer/Sidebar';
import type { ByokStatus } from '../src/byok-types';
import type { User, SetupResult, QuotaModel } from '../src/renderer/api';

const user: User = { email: 'user@example.com', name: 'User', picture: '', project: null, tier: null, authProvider: 'antigravity', accountType: 'consumer' };
const status: ByokStatus = { hasKey: true, storageAvailable: true, preferredRoute: 'byok', validationStatus: 'valid', lastValidatedAt: 1, lastError: '' };
const setup: SetupResult = { project: 'project', tier: 'free', status: 'ready', provider: 'antigravity', accountType: 'consumer' };
const quota: QuotaModel = { modelId: 'gemini-proxy-only-high', remainingFraction: 0.42, resetTime: '2099-01-01T00:00:00Z', tokenType: '' };

test('BYOK cannot bypass login', async () => {
  let called = false;
  expect(await prepareProviderSession(null, status, async () => { called = true; return setup; })).toBeNull();
  expect(called).toBe(false);
});

test('validated BYOK enters before provisioning resolves', async () => {
  let resolve!: (result: SetupResult) => void;
  const deferred = new Promise<SetupResult>(done => { resolve = done; });
  const ready = await prepareProviderSession(user, status, () => deferred);
  expect(ready?.user).toEqual(user);
  expect(ready?.background).toBeDefined();
  resolve(setup);
  expect((await ready?.background)?.project).toBe('project');
});

for (const reason of ['TOS_REQUIRED:https://example.com/terms', 'Enterprise is unsupported', 'Network failure']) {
  test(`BYOK entry survives proxy failure: ${reason}`, async () => {
    const ready = await prepareProviderSession(user, status, async () => { throw new Error(reason); });
    expect(ready?.user).toEqual(user);
    await expect(ready?.background).rejects.toThrow(reason);
  });
}

for (const patch of [{ preferredRoute: 'proxy' }, { validationStatus: 'untested' }, { validationStatus: 'invalid' }, { hasKey: false }, { storageAvailable: false }]) {
  test(`proxy setup still gates entry for ${JSON.stringify(patch)}`, async () => {
    const candidate = { ...status, ...patch } as ByokStatus;
    expect(isByokReady(candidate)).toBe(false);
    await expect(prepareProviderSession(user, candidate, async () => { throw new Error('setup required'); })).rejects.toThrow('setup required');
  });
}

test('provisioned sessions do not repeat setup', async () => {
  const ready = await prepareProviderSession({ ...user, project: 'existing' }, status, async () => { throw new Error('must not call'); });
  expect(ready?.user.project).toBe('existing');
  expect(ready?.background).toBeUndefined();
});

test('BYOK catalog never derives from proxy quotas; restored aliases are replaced', () => {
  expect(providerModels(true, [quota])).toEqual(BYOK_MODELS);
  expect(providerModels(true, [])).toEqual(BYOK_MODELS);
  expect(providerModels(false, [quota])).toEqual([quota.modelId]);
  expect(compatibleModel(quota.modelId, BYOK_MODELS)).toBe(BYOK_MODELS[0]);
  expect(compatibleModel('gemini-2.5-pro', BYOK_MODELS)).toBe('gemini-2.5-pro');
});

test('BYOK sidebar never presents proxy percentages or reset countdown', () => {
  const props = {
    user, quotas: [quota], quotaLoading: false, selectedModel: quota.modelId, sessions: [], activeSessionId: null,
    activeTab: 'chat' as const, onSelectSession() {}, onNewChat() {}, onSettings() {}, onLogout() {}, onRefreshQuota() {}, onToggleCollapse() {}, onTabChange() {},
  };
  const byok = renderToStaticMarkup(<Sidebar {...props} usingByok />);
  expect(byok).toContain('Google AI Studio');
  expect(byok).not.toContain('42%');
  expect(byok).not.toContain('2099');
  const proxy = renderToStaticMarkup(<Sidebar {...props} usingByok={false} />);
  expect(proxy).toContain('Antigravity proxy');
  expect(proxy).toContain('42%');
});
