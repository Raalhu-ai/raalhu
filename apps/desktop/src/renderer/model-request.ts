import { byokFailureKind, byokFailureMessages } from '../byok-failure';
import { fetchWithRetry } from './agent/retry';
import type { ModelRequest } from '../model-request-types';

export class ModelRequestError extends Error {
  constructor(message: string, readonly module: string | null) { super(message); }
}

/** Chat and titles share routing, session authentication and retry handling. */
export async function fetchModelRequest(endpoint: ModelRequest['endpoint'], init: RequestInit, proxyFallback = false): Promise<Response> {
  if (endpoint !== '/api/stream' && endpoint !== '/api/generate') throw new Error('Unsupported model endpoint.');
  let module: string | null = null;
  let retryable = true;
  const fetcher = createModelFetcher(endpoint, proxyFallback);
  try {
    return await fetchWithRetry(endpoint, init, (async (input, request) => {
      const response = await fetcher(input, request);
      module = response.headers.get('X-Resolved-Model-Module');
      if (module === 'ai-sdk' && !response.ok) {
        const kind = byokFailureKind(await response.clone().json().catch(() => null));
        if (kind === 'cancelled') throw new DOMException(byokFailureMessages[kind], 'AbortError');
        retryable = kind !== 'credentials' && kind !== 'model-access';
      }
      return response;
    }) as typeof fetch, response => retryable && (endpoint !== '/api/stream' || response.headers.get('X-Resolved-Model-Module') !== 'ai-sdk'));
  } catch (error) {
    if (init.signal?.aborted || byokFailureKind(error) === 'cancelled') throw error;
    if (module !== 'ai-sdk') throw error;
    throw new ModelRequestError(error instanceof Error ? error.message : String(error), module);
  }
}

export function createModelFetcher(endpoint: ModelRequest['endpoint'], proxyFallback = false): typeof fetch {
  return (async (_input, init) => {
    const api = window.platform?.modelRequests;
    if (!api) throw new Error('Open the desktop app to send model requests.');
    if (init?.method !== 'POST' || typeof init.body !== 'string') throw new Error('Invalid model request.');
    const signal = init.signal;
    signal?.throwIfAborted();
    const id = crypto.randomUUID();
    let closed = false;
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    let rejectAbort!: (reason: unknown) => void;
    const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
    const cleanup = () => { signal?.removeEventListener('abort', abort); };
    const cancelRemote = () => { void api.cancel(id).catch(() => {}); };
    const abort = () => {
      if (closed) return;
      closed = true;
      cleanup();
      cancelRemote();
      const reason = signal?.reason ?? new DOMException('Request cancelled', 'AbortError');
      if (controller) controller.error(reason);
      rejectAbort(reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const metadata = await Promise.race([api.start({
        id, endpoint, body: init.body,
        ...(proxyFallback && { proxyFallback: true }),
        session: new Headers(init.headers).get('X-Session') || '',
      }), aborted]);
      signal?.throwIfAborted();
      const stream = new ReadableStream<Uint8Array>({
        start(value) { controller = value; },
        async pull(value) {
          try {
            const chunk = await api.read(id);
            if (closed) return;
            if (chunk.done) { closed = true; cleanup(); value.close(); }
            else if (chunk.value) value.enqueue(new Uint8Array(chunk.value));
          } catch (error) {
            if (closed) return;
            closed = true;
            cleanup();
            cancelRemote();
            value.error(error);
          }
        },
        cancel() { closed = true; cleanup(); cancelRemote(); },
      });
      if ([204, 205, 304].includes(metadata.status)) {
        await stream.cancel();
        return new Response(null, metadata);
      }
      return new Response(stream, metadata);
    } catch (error) {
      closed = true;
      cleanup();
      cancelRemote();
      throw error;
    }
  }) as typeof fetch;
}
