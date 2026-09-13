import type { ByokStatus } from '../byok-types';
import type { User, SetupResult, QuotaModel } from './api';

// Public Gemini IDs already supported by the app, independent of proxy aliases/quota.
export const BYOK_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-pro'];
const PROXY_FALLBACK_MODELS = [...BYOK_MODELS];
export function isByokReady(status: ByokStatus | null | undefined): boolean {
  return !!status && status.preferredRoute === 'byok' && status.validationStatus === 'valid' && status.hasKey && status.storageAvailable;
}
export function providerModels(byok: boolean, quotas: QuotaModel[]): string[] {
  return byok ? [...BYOK_MODELS] : quotas.length ? [...new Set(quotas.map(q => q.modelId))] : [...PROXY_FALLBACK_MODELS];
}
export function compatibleModel(selected: string, models: string[]): string {
  return models.includes(selected) ? selected : models.includes(BYOK_MODELS[0]) ? BYOK_MODELS[0] : models[0];
}

/** Authentication remains mandatory; only proxy provisioning can run in the background. */
export async function prepareProviderSession(user: User | null, status: ByokStatus | null, setup: () => Promise<SetupResult>) {
  if (!user) return null;
  if (user.project) return { user, background: undefined };
  const provisioning = setup().then(result => ({ ...user, project: result.project, tier: result.tier }));
  // A caller may be superseded by logout before it attaches its background handler.
  void provisioning.catch(() => {});
  if (isByokReady(status)) return { user, background: provisioning };
  return { user: await provisioning, background: undefined };
}
