import type { ByokFailureKind } from './byok-failure';
export interface ByokPreferences {
  // Persisted selection. Request resolution and fallback never rewrite it.
  preferredRoute: 'proxy' | 'byok';
  validationStatus: 'untested' | 'valid' | 'invalid';
  lastValidatedAt: number | null;
  lastError: string;
  lastFailureKind?: ByokFailureKind | null;
  // Binds metadata to the encrypted file, including after a database restore.
  credentialId: string;
}
export const defaultByokPreferences: ByokPreferences = {
  preferredRoute: 'proxy', validationStatus: 'untested', lastValidatedAt: null, lastError: '', lastFailureKind: null, credentialId: '',
};
export interface ByokStatus extends Omit<ByokPreferences, 'credentialId'> {
  hasKey: boolean;
  storageAvailable: boolean;
}
export interface ByokAPI {
  status(): Promise<ByokStatus>;
  save(key: string): Promise<ByokStatus>;
  remove(): Promise<ByokStatus>;
  test(): Promise<ByokStatus>;
  setPreferredRoute(route: 'proxy' | 'byok'): Promise<ByokStatus>;
}
