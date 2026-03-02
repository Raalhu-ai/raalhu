<script lang="ts">
	let { args = {}, result = undefined, status = 'running' }: {
		args: Record<string, unknown>;
		result?: Record<string, unknown> | string;
		status: 'running' | 'done' | 'error';
	} = $props();

	let path = $derived(args.path as string || '');
	let isError = $derived(status === 'error');
	let errorMsg = $derived.by(() => {
		if (!isError || !result) return '';
		if (typeof result === 'string') return result;
		return (result as Record<string, unknown>).error as string || '';
	});
</script>

{#if isError}
	<p class="text-xs text-destructive mt-1" dir="ltr">{errorMsg}</p>
{:else if status === 'done'}
	<p class="text-[10px] text-green-400/80 mt-1">✓ <span class="font-mono" dir="ltr">{path}</span></p>
{/if}
