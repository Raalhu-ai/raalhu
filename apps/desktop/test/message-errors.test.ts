import { expect, test, mock } from 'bun:test';
let response: Response;
mock.module('../src/renderer/agent/retry', () => ({fetchWithRetry: async () => response,TerminalQuotaError: class extends Error {}}));
const { GeminiChatTransport } = await import('../src/renderer/agent/gemini-transport');
async function run(body: string) {
 response = new Response(body);
 const transport = new GeminiChatTransport({model:'test',systemInstruction:{role:'user',parts:[{text:'test'}]}});
 const stream = await transport.sendMessages({chatId:'test',messages:[],trigger:'submit-message'});
 const chunks = [];
 for await (const chunk of stream) chunks.push(chunk);
 return chunks;
}
for (const [name, body, expected] of [
 ['empty stream', '', 'no answer'],
 ['structured stream error', 'data: {"error":{"message":"Account verification required"}}\n\n', 'Account verification required'],
 ['blocked prompt', 'data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n', 'SAFETY'],
 ['token limit', 'data: {"candidates":[{"finishReason":"MAX_TOKENS"}]}\n\n', 'MAX_TOKENS'],
 ['malformed stream', 'data: invalid\n\n', 'unreadable'],
] as const) test(name, async () => {
 const chunks = await run(body);
 expect(chunks).toContainEqual({type:'error',errorText:expect.stringContaining(expected)});
 expect(chunks.some(c => c.type === 'finish')).toBe(false);
});
test('accepts final data line without newline or space', async () => {
 const chunks = await run('data:{"candidates":[{"content":{"parts":[{"text":"hello"}]},"finishReason":"STOP"}]}');
 expect(chunks).toContainEqual({type:'text-delta',id:expect.any(String),delta:'hello'});
 expect(chunks).toContainEqual({type:'finish',finishReason:'stop'});
});
test('HTTP failures preserve the server explanation', async () => {
 response = new Response(JSON.stringify({error:'Please sign in again.'}), {status:401});
 const transport = new GeminiChatTransport({model:'test',systemInstruction:{role:'user',parts:[{text:'test'}]}});
 expect(transport.sendMessages({chatId:'test',messages:[],trigger:'submit-message'})).rejects.toThrow('API error (401): Please sign in again.');
});
test('tool-only response completes normally', async () => {
 const chunks = await run('data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"list_files","args":{}}}]},"finishReason":"STOP"}]}\n\n');
 expect(chunks.some(c => c.type === 'tool-input-available')).toBe(true);
 expect(chunks).toContainEqual({type:'finish',finishReason:'stop'});
});
