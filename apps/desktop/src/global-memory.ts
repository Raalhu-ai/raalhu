export const MEMORY_LIMIT = 2400;
export const MEMORY_COMPACTION_MS = 4 * 24 * 60 * 60 * 1000;
export const EMPTY_MEMORY = 'No durable user facts have been learned yet.\n\nNo enduring response preferences have been learned yet.';

/** Reject malformed output instead of replacing good memory with truncated prose. */
export function validateGlobalMemory(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid global memory');
  const paragraphs = value.trim().split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim());
  if (paragraphs.length !== 2 || paragraphs.some(p => !p) || paragraphs.join('\n\n').length > MEMORY_LIMIT) {
    throw new Error('Global memory must contain exactly two paragraphs, at most 2400 characters');
  }
  return paragraphs.join('\n\n');
}
