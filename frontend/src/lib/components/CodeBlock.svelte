<script lang="ts">
	import { onMount } from 'svelte';
	import { Copy, Check } from 'lucide-svelte';
	import hljs from 'highlight.js/lib/core';

	// Register common languages
	import javascript from 'highlight.js/lib/languages/javascript';
	import typescript from 'highlight.js/lib/languages/typescript';
	import python from 'highlight.js/lib/languages/python';
	import css from 'highlight.js/lib/languages/css';
	import xml from 'highlight.js/lib/languages/xml';
	import json from 'highlight.js/lib/languages/json';
	import bash from 'highlight.js/lib/languages/bash';
	import sql from 'highlight.js/lib/languages/sql';
	import markdown from 'highlight.js/lib/languages/markdown';
	import yaml from 'highlight.js/lib/languages/yaml';

	hljs.registerLanguage('javascript', javascript);
	hljs.registerLanguage('js', javascript);
	hljs.registerLanguage('typescript', typescript);
	hljs.registerLanguage('ts', typescript);
	hljs.registerLanguage('python', python);
	hljs.registerLanguage('py', python);
	hljs.registerLanguage('css', css);
	hljs.registerLanguage('html', xml);
	hljs.registerLanguage('xml', xml);
	hljs.registerLanguage('json', json);
	hljs.registerLanguage('bash', bash);
	hljs.registerLanguage('sh', bash);
	hljs.registerLanguage('shell', bash);
	hljs.registerLanguage('sql', sql);
	hljs.registerLanguage('markdown', markdown);
	hljs.registerLanguage('md', markdown);
	hljs.registerLanguage('yaml', yaml);
	hljs.registerLanguage('yml', yaml);

	let { code, language = '' }: {
		code: string;
		language?: string;
	} = $props();

	let copied = $state(false);
	let codeEl = $state<HTMLElement | undefined>();

	let highlightedHtml = $derived.by(() => {
		const lang = language.toLowerCase().trim();
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(code, { language: lang }).value;
			} catch {
				return escapeHtml(code);
			}
		}
		// Auto-detect
		try {
			const result = hljs.highlightAuto(code);
			return result.value;
		} catch {
			return escapeHtml(code);
		}
	});

	function escapeHtml(str: string): string {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function copyCode() {
		navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => copied = false, 1500);
	}

	let displayLang = $derived(language ? language.toUpperCase() : '');
</script>

<div class="code-block-wrapper relative group/code">
	<!-- Header bar -->
	{#if displayLang}
		<div class="flex items-center justify-between px-3 py-1 border-b border-border/50">
			<span class="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">{displayLang}</span>
			<button
				onclick={copyCode}
				class="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors opacity-0 group-hover/code:opacity-100"
				title="Copy"
			>
				{#if copied}
					<Check class="w-3 h-3 text-green-400" />
				{:else}
					<Copy class="w-3 h-3" />
				{/if}
			</button>
		</div>
	{:else}
		<button
			onclick={copyCode}
			class="absolute top-2 left-2 p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors opacity-0 group-hover/code:opacity-100 z-10"
			title="Copy"
		>
			{#if copied}
				<Check class="w-3 h-3 text-green-400" />
			{:else}
				<Copy class="w-3 h-3" />
			{/if}
		</button>
	{/if}

	<!-- Code content -->
	<pre class="max-h-96 overflow-auto p-3"><code bind:this={codeEl} class="hljs" dir="ltr">{@html highlightedHtml}</code></pre>
</div>
