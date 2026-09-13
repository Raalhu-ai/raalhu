export interface ModelRequest {
  id: string;
  endpoint: '/api/stream' | '/api/generate';
  body: string;
  session: string;
  proxyFallback?: boolean;
}
export interface ModelResponse {
  status: number;
  headers: Record<string, string>;
}
export interface ModelRequestsAPI {
  start(request: ModelRequest): Promise<ModelResponse>;
  read(id: string): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(id: string): Promise<void>;
}
