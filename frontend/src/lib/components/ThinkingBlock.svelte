<script lang="ts">
	import { Brain, ChevronDown, ChevronLeft } from 'lucide-svelte';
	import { englishToThaana } from '$lib/transliterate';
	import { parseMarkdown } from '$lib/markdown';
	import CodeBlock from './CodeBlock.svelte';

	let { content = '' }: { content?: string } = $props();
	let expanded = $state(false);

	const thaanaContent = $derived(content ? englishToThaana(content) : '');
	const segments = $derived(thaanaContent ? parseMarkdown(thaanaContent) : []);
	const expandable = $derived(!!content);
</script>

<div class="mb-0.5">
	<button
		onclick={() => { if (expandable) expanded = !expanded; }}
		class="group/step inline-flex items-center gap-1.5 h-7 text-xs transition-colors"
	>
		<Brain class="w-3 h-3 text-muted-foreground/60 shrink-0" />

		<span class="thaana text-xs text-muted-foreground/70">
			ވިސްނަނީ...
		</span>

		{#if expandable}
			<span class="{expanded ? 'opacity-100' : 'opacity-0 group-hover/step:opacity-100'} transition-opacity duration-150">
				{#if expanded}
					<ChevronDown class="w-3 h-3 text-muted-foreground/40" />
				{:else}
					<ChevronLeft class="w-3 h-3 text-muted-foreground/40" />
				{/if}
			</span>
		{/if}
	</button>

	{#if expanded}
		<div class="mr-6 pb-1.5">
			{#if segments.length > 0}
				<div class="text-[13px] leading-[38px] text-muted-foreground/50 break-words thaana prose-chat" dir="rtl">
					{#each segments as seg}
						{#if seg.type === 'html'}
							{@html seg.content}
						{:else}
							<CodeBlock code={seg.code} language={seg.language} />
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-[10px] text-muted-foreground/40 italic thaana">ކޮންޓެންޓް ނެތް</p>
			{/if}
		</div>
	{/if}
</div>
