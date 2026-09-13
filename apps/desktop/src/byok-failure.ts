/** Stable backend failure categories; HTTP 401 alone may mean an expired app session. */
export type ByokFailureKind = 'credentials' | 'quota' | 'network' | 'model-access' | 'cancelled' | 'unknown';
export const byokFailureMessages: Record<ByokFailureKind, string> = {
  credentials: 'Google rejected this API key. Check or replace it.',
  quota: 'Google quota or rate limit reached. Try again later.',
  network: 'Could not reach Google. Check your connection and try again.',
  'model-access': 'This key cannot access the model. Check API restrictions and project permissions, or choose another model.',
  cancelled: 'The request was cancelled.',
  unknown: 'Google could not complete the request. Try again later.',
};
export function byokFailureKind(error: unknown): ByokFailureKind {
  if (error && typeof error === 'object') {
    const value = error as { failureKind?: unknown; name?: string };
    if (value.name === 'AbortError') return 'cancelled';
    if (value.name === 'TimeoutError' || error instanceof TypeError) return 'network';
    if (typeof value.failureKind === 'string' && Object.hasOwn(byokFailureMessages, value.failureKind)) return value.failureKind as ByokFailureKind;
  }
  return 'unknown';
}
