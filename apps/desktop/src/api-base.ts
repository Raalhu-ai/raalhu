declare const __RAALHU_RELEASE_API_BASE__: string;

// Only a public URL is bundled; personal credentials are supplied after installation.
export function getApiBase(): string {
  const bundled = typeof __RAALHU_RELEASE_API_BASE__ === 'string' ? __RAALHU_RELEASE_API_BASE__ : '';
  return process.env.RAALHU_API_BASE || bundled || 'http://127.0.0.1:3000';
}
