<script lang="ts">
	let { args = {}, result = undefined, status = 'running' }: {
		args: Record<string, unknown>;
		result?: Record<string, unknown> | string;
		status: 'running' | 'done' | 'error';
	} = $props();

	let isError = $derived(status === 'error');
	let errorMsg = $derived.by(() => {
		if (!isError || !result) return '';
		if (typeof result === 'string') return result;
		return (result as Record<string, unknown>).error as string || '';
	});
	let entryCount = $derived.by(() => {
		if (!result || isError) return 0;
		if (typeof result === 'string') {
			try {
				const parsed = JSON.parse(result);
				if (Array.isArray(parsed.entries)) return parsed.entries.length;
				if (Array.isArray(parsed)) return parsed.length;
			} catch { /* ignore */ }
			return result.split('\n').filter(Boolean).length;
		}
		const r = result as Record<string, unknown>;
		if (Array.isArray(r.entries)) return r.entries.length;
		return 0;
	});
</script>

{#if isError}
	<p class="text-xs text-destructive mt-1" dir="ltr">{errorMsg}</p>
{:else if status === 'done'}
	<p class="text-[10px] text-green-400/80 mt-1">✓ <span dir="ltr">{entryCount}</span> <span class="thaana">އެންޓްރީ</span></p>
{/if}
