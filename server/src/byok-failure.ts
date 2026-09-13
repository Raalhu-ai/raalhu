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

/** Only classify credential rejection from the upstream provider, never an app HTTP status. */
export function googleFailure(error: unknown, status?: number): { error: string; failureKind: ByokFailureKind } {
  const value = error as any;
  let body = value;
  if (typeof value?.responseBody === 'string') {
    try { body = JSON.parse(value.responseBody); } catch { body = null; }
  }
  status ??= value?.statusCode;
  const details = body?.error?.details;
  let failureKind: ByokFailureKind;
  if (value?.name === 'AbortError') failureKind = 'cancelled';
  else if (status === 401 || (Array.isArray(details) && details.some((d: any) => ['API_KEY_INVALID', 'API_KEY_EXPIRED'].includes(d?.reason)))) failureKind = 'credentials';
  else if (status === 429 || body?.error?.status === 'RESOURCE_EXHAUSTED') failureKind = 'quota';
  else if (status === 403 || status === 404) failureKind = 'model-access';
  else if (value?.cause && !status) return googleFailure(value.cause);
  else if (value?.lastError && !status) return googleFailure(value.lastError);
  else failureKind = byokFailureKind(error);
  return { error: byokFailureMessages[failureKind], failureKind };
}
