<script lang="ts">
	import { parseMarkdown } from '$lib/markdown';
	import CodeBlock from '../CodeBlock.svelte';

	let { result = undefined }: {
		result?: Record<string, unknown> | string;
	} = $props();

	const rawContent = $derived(() => {
		if (!result) return '';
		if (typeof result === 'string') return result;
		return (result.content as string) || '';
	});

	// Parse source URLs from the "Sources:" block at the end.
	// Format: [N] title (url)
	const sourceUrls = $derived(() => {
		const text = rawContent();
		const map: Record<string, string> = {};
		const sourcesIdx = text.lastIndexOf('\nSources:\n');
		if (sourcesIdx === -1) return map;
		const sourcesBlock = text.slice(sourcesIdx);
		const re = /\[(\d+)\]\s+(.+?)\s+\((\S+)\)/g;
		let m;
		while ((m = re.exec(sourcesBlock)) !== null) {
			map[m[1]] = m[3]; // number -> url
		}
		return map;
	});

	// Split body from sources section, then make [N] citations into clickable links.
	const content = $derived(() => {
		let text = rawContent();
		const sourcesIdx = text.lastIndexOf('\nSources:\n');
		if (sourcesIdx !== -1) {
			text = text.slice(0, sourcesIdx);
		}
		const urls = sourceUrls();
		text = text.replace(/\[(\d+)\]/g, (_match, num) => {
			const url = urls[num];
			if (url) {
				return `<a href="${url}" target="_blank" rel="noopener noreferrer"><sup>[${num}]</sup></a>`;
			}
			return `<sup>[${num}]</sup>`;
		});
		return text;
	});

	// Build sources list for the footer.
	const sourcesList = $derived(() => {
		const text = rawContent();
		const sourcesIdx = text.lastIndexOf('\nSources:\n');
		if (sourcesIdx === -1) return [];
		const sourcesBlock = text.slice(sourcesIdx);
		const entries: { num: string; title: string; url: string }[] = [];
		const re = /\[(\d+)\]\s+(.+?)\s+\((\S+)\)/g;
		let m;
		while ((m = re.exec(sourcesBlock)) !== null) {
			entries.push({ num: m[1], title: m[2], url: m[3] });
		}
		return entries;
	});

	const segments = $derived(parseMarkdown(content()));
</script>

{#if content()}
	<div>
		<div
			class="web-result-box mt-1.5 rounded-lg border border-border/50 bg-muted/30 p-3"
			dir="ltr"
		>
			{#each segments as seg}
				{#if seg.type === 'html'}
					{@html seg.content}
				{:else}
					<CodeBlock code={seg.code} language={seg.language} />
				{/if}
			{/each}

			{#if sourcesList().length > 0}
				<div class="mt-3 pt-2 border-t border-border/30">
					<div class="text-[10px] font-medium text-muted-foreground/70 mb-1">Sources</div>
					{#each sourcesList() as src}
						<div class="text-[10px] leading-4 truncate">
							<span class="text-primary/70">[{src.num}]</span>
							<a href={src.url} target="_blank" rel="noopener noreferrer" class="text-muted-foreground/60 hover:text-primary hover:underline">{src.title}</a>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.web-result-box {
		max-height: 350px;
		overflow-y: auto;
		font-size: 12px;
		line-height: 1.7;
		text-align: left;
		color: var(--muted-foreground);
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.web-result-box :global(p) {
		margin: 0.4em 0;
	}
	.web-result-box :global(p:first-child) {
		margin-top: 0;
	}
	.web-result-box :global(ul) {
		margin: 0.4em 0;
		padding-left: 1.25em;
		list-style-type: disc;
	}
	.web-result-box :global(ol) {
		margin: 0.4em 0;
		padding-left: 1.25em;
		list-style-type: decimal;
	}
	.web-result-box :global(li) {
		margin: 0.15em 0;
		display: list-item;
	}
	.web-result-box :global(strong) {
		font-weight: 700;
		color: var(--foreground);
	}
	.web-result-box :global(a) {
		color: var(--primary);
		text-decoration: none;
	}
	.web-result-box :global(a:hover) {
		text-decoration: underline;
	}
	.web-result-box :global(sup) {
		font-size: 0.7em;
	}
	.web-result-box :global(sup a) {
		color: var(--primary);
		font-weight: 600;
	}
</style>
