<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Download, Maximize2, Minimize2 } from 'lucide-svelte';
	import type { WidgetData } from '$lib/agent/types';

	let { data, onSendPrompt }: { data: WidgetData; onSendPrompt?: (text: string) => void } = $props();

	let iframeEl: HTMLIFrameElement;
	let expanded = $state(false);
	let height = $state(300);
	let srcdoc = $state('');

	const FONT_FACES = `
@font-face {
	font-family: "MV Typewriter";
	src: url("/fonts/mvtyper.ttf") format("truetype");
	font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
	font-family: "MV Typewriter";
	src: url("/fonts/mvtypebold.ttf") format("truetype");
	font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
	font-family: "Sangu Suruhee";
	src: url("/fonts/SanguSuruhee-Regular.woff2") format("woff2"),
	     url("/fonts/SanguSuruhee-Regular.woff") format("woff");
	font-weight: 400; font-style: normal; font-display: swap;
}`;

	const FONT_STACK = `"MV Typewriter", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
	const HEADING_STACK = `"Sangu Suruhee", "MV Typewriter", -apple-system, sans-serif`;

	function buildHtml(): string {
		if (data.mode === 'svg') {
			return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${FONT_FACES}
html, body { margin: 0; padding: 16px; background: #242526; display: flex; align-items: center; justify-content: center; min-height: 100%; font-family: ${FONT_STACK}; }
svg { max-width: 100%; height: auto; }
svg text { font-family: ${FONT_STACK}; }
</style></head>
<body>${data.widget_code}
<script>
new ResizeObserver(function() {
	var h = document.documentElement.scrollHeight;
	window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
}).observe(document.body);
<\/script>
</body></html>`;
		}

		const trimmed = data.widget_code.trimStart().toLowerCase();
		if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
			// Full document — inject font-face into head if possible
			return data.widget_code.replace(
				/<head([^>]*)>/i,
				`<head$1><style>${FONT_FACES}</style>`
			);
		}

		return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${FONT_FACES}
html, body { margin: 0; padding: 16px; background: #242526; color: #e4e6eb; font-family: ${FONT_STACK}; }
h1, h2, h3 { font-family: ${HEADING_STACK}; }
* { box-sizing: border-box; }
</style></head>
<body>${data.widget_code}
<script>
function sendPrompt(text) {
	window.parent.postMessage({ type: 'widget-send-prompt', text: text }, '*');
}
new ResizeObserver(function() {
	var h = document.documentElement.scrollHeight;
	window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
}).observe(document.body);
<\/script>
</body></html>`;
	}

	function handleMessage(e: MessageEvent) {
		if (e.data?.type === 'widget-resize') {
			height = Math.min(Math.max(e.data.height + 32, 200), 800);
		}
		if (e.data?.type === 'widget-send-prompt' && onSendPrompt) {
			onSendPrompt(e.data.text);
		}
	}

	function handleDownload() {
		const ext = data.mode === 'svg' ? 'svg' : 'html';
		const mime = data.mode === 'svg' ? 'image/svg+xml' : 'text/html';
		const blob = new Blob([data.widget_code], { type: mime });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${data.title}.${ext}`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	onMount(() => {
		srcdoc = buildHtml();
		window.addEventListener('message', handleMessage);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', handleMessage);
		}
	});
</script>

<div class="mt-3 rounded-xl border border-border overflow-hidden bg-[#242526] {expanded ? 'fixed inset-4 z-50' : ''}">
	<div class="flex items-center justify-between px-3 py-1.5 bg-accent/30 border-b border-border">
		<span class="text-xs text-muted-foreground font-mono">{data.title}</span>
		<div class="flex items-center gap-1">
			<button
				onclick={handleDownload}
				class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			>
				<Download size={14} />
			</button>
			<button
				onclick={() => expanded = !expanded}
				class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			>
				{#if expanded}
					<Minimize2 size={14} />
				{:else}
					<Maximize2 size={14} />
				{/if}
			</button>
		</div>
	</div>
	{#if srcdoc}
		<iframe
			bind:this={iframeEl}
			{srcdoc}
			sandbox="allow-scripts allow-same-origin"
			class="w-full border-0"
			style="height: {expanded ? 'calc(100% - 36px)' : `${height}px`}"
			title={data.title}
		></iframe>
	{/if}
</div>
