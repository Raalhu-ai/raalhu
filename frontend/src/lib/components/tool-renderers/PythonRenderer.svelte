<script lang="ts">
	import { AlertTriangle, ChevronDown, ChevronLeft } from 'lucide-svelte';
	import CodeBlock from '../CodeBlock.svelte';

	let { args = {}, result = undefined, status = 'running' }: {
		args?: Record<string, unknown>;
		result?: Record<string, unknown> | string;
		status: 'running' | 'done' | 'error';
	} = $props();

	let code = $derived((args?.code as string) || '');
	let showCode = $state(false);

	let parsed = $derived.by(() => {
		if (!result) return null;
		if (typeof result === 'string') {
			try { return JSON.parse(result); } catch { return { stdout: result }; }
		}
		return result;
	});

	let stdout = $derived(parsed?.stdout as string || '');
	let stderr = $derived(parsed?.stderr as string || '');
	let error = $derived(parsed?.error as string || '');
</script>

{#if code}
	<button
		onclick={() => showCode = !showCode}
		class="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5 mb-1"
	>
		{#if showCode}
			<ChevronDown class="w-3 h-3" />
		{:else}
			<ChevronLeft class="w-3 h-3" />
		{/if}
		<span class="thaana">ކޯޑް</span>
	</button>
	{#if showCode}
		<div class="max-h-[300px] overflow-y-auto mb-1">
			<CodeBlock {code} language="python" />
		</div>
	{/if}
{/if}

{#if status === 'error' && error}
	<p class="text-xs text-destructive font-mono mt-1" dir="ltr">{error}</p>
{:else}
	{#if stdout}
		<pre class="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto mt-1 max-h-[200px] overflow-y-auto" dir="ltr">{stdout}</pre>
	{/if}
	{#if stderr}
		<div class="flex items-start gap-1.5 mt-1.5">
			<AlertTriangle class="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
			<pre class="text-[10px] text-amber-400/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[150px] overflow-y-auto" dir="ltr">{stderr}</pre>
		</div>
	{/if}
	{#if !stdout && !stderr && parsed}
		<p class="text-[10px] text-muted-foreground/60 mt-1 thaana">ނަތީޖާ ނެތް</p>
	{/if}
{/if}
