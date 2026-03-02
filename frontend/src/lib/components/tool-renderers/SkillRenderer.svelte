<script lang="ts">
	let { result = undefined, status = 'running' }: {
		args: Record<string, unknown>;
		result?: Record<string, unknown> | string;
		status: 'running' | 'done' | 'error';
	} = $props();

	let errorMsg = $derived.by(() => {
		if (status !== 'error' || !result) return '';
		if (typeof result === 'string') return result;
		return (result as Record<string, unknown>).error as string || '';
	});
</script>

{#if status === 'error' && errorMsg}
	<p class="text-xs text-destructive mt-1" dir="ltr">{errorMsg}</p>
{/if}
