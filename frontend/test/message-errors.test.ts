import { expect, test, mock } from 'bun:test';
import { TerminalQuotaError } from '../src/lib/agent/retry';
let respond: () => Promise<Response>;
mock.module('../src/lib/gemini-api', () => ({ fetchWithModelFallback: () => respond(), markProviderKeyFailed: () => {} }));
mock.module('../src/lib/agent/executor', () => ({ executeToolCall: () => { throw new Error('Unexpected tool call'); } }));
const { agentLoop } = await import('../src/lib/agent/loop');
async function run(body?: string) {
 if (body !== undefined) respond = async () => new Response(body);
 const events = [];
 for await (const event of agentLoop({model:'test', conversationId:'test',contents:[],systemInstruction:{role:'user',parts:[{text:'test'}]},sandbox:{} as any})) events.push(event);
 return events;
}
test('daily quota emits an error instead of stopping silently', async () => {
 respond = async () => {throw new TerminalQuotaError('Daily quota exhausted');};
 expect(await run()).toContainEqual({type:'error',message:expect.stringContaining('Daily quota exhausted')});
});
for (const [name, body, expected] of [
 ['empty stream', '', 'no answer'],
 ['structured error', 'data: {"error":{"message":"Account verification required"}}\n\n', 'Account verification required'],
 ['blocked prompt', 'data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n', 'SAFETY'],
 ['token limit', 'data: {"candidates":[{"finishReason":"MAX_TOKENS"}]}\n\n', 'MAX_TOKENS'],
] as const) test(name, async () => {
 expect(await run(body)).toContainEqual({type:'error',message:expect.stringContaining(expected)});
});
test('accepts data without a space and final line without newline', async () => {
 const events = await run('data:{"candidates":[{"content":{"parts":[{"text":"hello"}]},"finishReason":"STOP"}]}');
 expect(events).toEqual([{type:'text-delta',content:'hello'}]);
});
