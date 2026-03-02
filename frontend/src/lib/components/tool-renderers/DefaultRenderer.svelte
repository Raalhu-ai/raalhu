<script lang="ts">
	let { result = undefined }: {
		result?: Record<string, unknown> | string;
	} = $props();
</script>

{#if result}
	<pre class="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto mt-1 max-h-[200px] overflow-y-auto" dir="ltr">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
{/if}
