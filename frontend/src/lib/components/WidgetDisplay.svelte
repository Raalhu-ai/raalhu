<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Download, Maximize2, Minimize2, Copy, Check, MoreHorizontal, Sparkles } from 'lucide-svelte';
	import type { WidgetData } from '$lib/agent/types';

	let { data, onSendPrompt }: { data: WidgetData; onSendPrompt?: (text: string) => void } = $props();

	let iframeEl: HTMLIFrameElement;
	let expanded = $state(false);
	let height = $state(300);
	let srcdoc = $state('');
	let popoverOpen = $state(false);
	let copyState = $state<'idle' | 'done' | 'error'>('idle');

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

	const WIDGET_CSS = `
:root {
  --p: #e4e6eb; --s: #8a8d91; --t: #6b6d71;
  --bg: #242526; --bg2: #2d2e2f; --bg3: #363738;
  --acc: #7d9fe3; --acc-d: #1a3a8a; --b: #3a3b3c;
  --ok: #4ade80; --warn: #fbbf24; --err: #f87171;
  --font: "MV Typewriter", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-h: "Sangu Suruhee", "MV Typewriter", -apple-system, sans-serif;
  --radius: 8px;
}
* { box-sizing: border-box; }
.t { font-size: 14px; fill: var(--p); font-family: var(--font); }
.ts { font-size: 12px; fill: var(--s); font-family: var(--font); }
.th { font-size: 14px; fill: var(--p); font-weight: 600; font-family: var(--font); }
.box { fill: var(--bg2); stroke: var(--b); stroke-width: 1; }
.arr { stroke: var(--acc); fill: none; stroke-width: 1.5; }
.leader { stroke: var(--s); stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
g.c-blue>rect,g.c-blue>ellipse,g.c-blue>circle,rect.c-blue,ellipse.c-blue,circle.c-blue{fill:#0c447c;stroke:#85b7eb}
.c-blue>.th,.c-blue>.t{fill:#b5d4f4}.c-blue>.ts{fill:#85b7eb}
g.c-teal>rect,g.c-teal>ellipse,g.c-teal>circle,rect.c-teal,ellipse.c-teal,circle.c-teal{fill:#085041;stroke:#5dcaa5}
.c-teal>.th,.c-teal>.t{fill:#9fe1cb}.c-teal>.ts{fill:#5dcaa5}
g.c-coral>rect,g.c-coral>ellipse,g.c-coral>circle,rect.c-coral,ellipse.c-coral,circle.c-coral{fill:#712b13;stroke:#f0997b}
.c-coral>.th,.c-coral>.t{fill:#f5c4b3}.c-coral>.ts{fill:#f0997b}
g.c-purple>rect,g.c-purple>ellipse,g.c-purple>circle,rect.c-purple,ellipse.c-purple,circle.c-purple{fill:#3c3489;stroke:#afa9ec}
.c-purple>.th,.c-purple>.t{fill:#cecbf6}.c-purple>.ts{fill:#afa9ec}
g.c-pink>rect,g.c-pink>ellipse,g.c-pink>circle,rect.c-pink,ellipse.c-pink,circle.c-pink{fill:#72243e;stroke:#ed93b1}
.c-pink>.th,.c-pink>.t{fill:#f4c0d1}.c-pink>.ts{fill:#ed93b1}
g.c-gray>rect,g.c-gray>ellipse,g.c-gray>circle,rect.c-gray,ellipse.c-gray,circle.c-gray{fill:#444441;stroke:#b4b2a9}
.c-gray>.th,.c-gray>.t{fill:#d3d1c7}.c-gray>.ts{fill:#b4b2a9}
g.c-green>rect,g.c-green>ellipse,g.c-green>circle,rect.c-green,ellipse.c-green,circle.c-green{fill:#27500a;stroke:#97c459}
.c-green>.th,.c-green>.t{fill:#c0dd97}.c-green>.ts{fill:#97c459}
g.c-amber>rect,g.c-amber>ellipse,g.c-amber>circle,rect.c-amber,ellipse.c-amber,circle.c-amber{fill:#633806;stroke:#ef9f27}
.c-amber>.th,.c-amber>.t{fill:#fac775}.c-amber>.ts{fill:#ef9f27}
g.c-red>rect,g.c-red>ellipse,g.c-red>circle,rect.c-red,ellipse.c-red,circle.c-red{fill:#791f1f;stroke:#f09595}
.c-red>.th,.c-red>.t{fill:#f7c1c1}.c-red>.ts{fill:#f09595}
.node { cursor: pointer; }
.node:hover > rect, .node:hover > ellipse, .node:hover > circle, .node:hover > .box { filter: brightness(1.3); }
.node:hover text { opacity: 0.8; }
h1,h2,h3,h4,h5,h6 { color: var(--p); font-family: var(--font-h); }
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),
select, textarea {
  width: 100%; height: 36px; padding: 8px 12px;
  font-size: 14px; font-family: var(--font);
  background: var(--bg); color: var(--p);
  border: 1px solid var(--b); border-radius: 6px;
  outline: none; transition: border-color 0.15s;
}
textarea { height: auto; min-height: 80px; resize: vertical; }
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):hover,
select:hover, textarea:hover { border-color: var(--s); }
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):focus,
select:focus, textarea:focus { border-color: var(--acc); box-shadow: 0 0 0 3px rgba(125,159,227,0.2); }
select { cursor: pointer; }
input[type="range"] {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 4px;
  background: rgba(255,255,255,0.1); border-radius: 2px; outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
  background: var(--bg2); border: 1px solid var(--b);
  cursor: pointer; transition: border-color 0.15s, transform 0.15s;
}
input[type="range"]:hover::-webkit-slider-thumb { border-color: var(--acc); transform: scale(1.1); }
input[type="range"]::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--bg2); border: 1px solid var(--b); cursor: pointer;
}
button {
  padding: 8px 16px; font-size: 14px;
  background: transparent; color: var(--p);
  border: 1px solid var(--b); border-radius: var(--radius);
  cursor: pointer; transition: background 0.15s, transform 0.1s;
  font-family: var(--font);
}
button:hover { background: var(--bg2); }
button:active { background: var(--b); transform: scale(0.98); }`;

	const MARKER_SVG = `<svg style="position:absolute;width:0;height:0" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#7d9fe3"/></marker></defs></svg>`;

	const RESIZE_SCRIPT = `new ResizeObserver(function(){var h=document.documentElement.scrollHeight;window.parent.postMessage({type:'widget-resize',height:h},'*')}).observe(document.body);`;

	const SEND_PROMPT_SCRIPT = `function sendPrompt(t){window.parent.postMessage({type:'widget-send-prompt',text:t},'*')}`;

	function buildHtml(): string {
		if (data.mode === 'svg') {
			return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${FONT_FACES}
${WIDGET_CSS}
html, body { margin: 0; padding: 16px; background: transparent !important; display: flex; align-items: center; justify-content: center; min-height: 100%; font-family: var(--font); }
svg { max-width: 100%; height: auto; }
</style></head>
<body>${MARKER_SVG}${data.widget_code}
<script>${RESIZE_SCRIPT}<\/script>
</body></html>`;
		}

		const trimmed = data.widget_code.trimStart().toLowerCase();
		let content = data.widget_code;

		// Full document — extract body content, preserve head styles, discard agent's wrapper
		if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
			const headMatch = data.widget_code.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
			const agentStyles = headMatch
				? [...headMatch[1].matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map(m => m[0]).join('\n')
				: '';
			const bodyMatch = data.widget_code.match(/<body[^>]*>([\s\S]*)<\/body>/i);
			content = (agentStyles ? agentStyles : '') + (bodyMatch ? bodyMatch[1] : data.widget_code);
		}

		return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${FONT_FACES}
${WIDGET_CSS}
html, body { margin: 0; padding: 16px; background: transparent !important; color: var(--p) !important; font-family: var(--font); }
</style></head>
<body>${MARKER_SVG}${content}
<script>${SEND_PROMPT_SCRIPT}${RESIZE_SCRIPT}<\/script>
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

	async function handleCopy() {
		popoverOpen = false;
		try {
			const { toBlob } = await import(/* @vite-ignore */ 'https://esm.sh/html-to-image@1.11.11');
			const target = iframeEl?.contentDocument?.body;
			if (!target) throw new Error('Cannot access iframe');
			const blob = await toBlob(target, {
				pixelRatio: 2,
				width: target.scrollWidth || 700,
				height: target.scrollHeight || 400,
				backgroundColor: '#242526',
			});
			if (!blob) throw new Error('Failed to create image');
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			copyState = 'done';
			setTimeout(() => { copyState = 'idle'; }, 1500);
		} catch (err) {
			console.error('Copy failed:', err);
			copyState = 'error';
			setTimeout(() => { copyState = 'idle'; }, 2000);
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
		popoverOpen = false;
	}

	function handleSaveArtifact() {
		if (onSendPrompt) {
			onSendPrompt(`Save this "${data.title}" visual as a downloadable file`);
		}
		popoverOpen = false;
	}

	function handleDocClick() {
		if (popoverOpen) popoverOpen = false;
	}

	onMount(() => {
		srcdoc = buildHtml();
		window.addEventListener('message', handleMessage);
		document.addEventListener('click', handleDocClick);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', handleMessage);
			document.removeEventListener('click', handleDocClick);
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative mt-3 group/widget {expanded ? 'fixed inset-4 z-50 bg-[#242526] rounded-xl overflow-hidden' : ''}"
>
	{#if srcdoc}
		<iframe
			bind:this={iframeEl}
			{srcdoc}
			sandbox="allow-scripts allow-same-origin"
			allowtransparency="true"
			class="w-full border-0 {expanded ? '' : 'rounded-lg'}"
			style="height: {expanded ? '100%' : `${height}px`}; background: transparent;"
			title={data.title}
		></iframe>
	{/if}

	<!-- Floating ⋯ button — visible on hover or when popover is open -->
	<div
		class="absolute top-2 right-2 z-10 transition-opacity duration-200
			{popoverOpen || expanded ? 'opacity-100' : 'opacity-0 group-hover/widget:opacity-100'}"
	>
		<button
			onclick={(e) => { e.stopPropagation(); popoverOpen = !popoverOpen; }}
			class="w-7 h-7 flex items-center justify-center rounded-md
				bg-[#2d2e2f]/90 backdrop-blur-sm
				border border-white/[0.08]
				text-[#8a8d91] hover:text-[#e4e6eb] hover:bg-[#363738]
				transition-all duration-150"
			aria-label="Widget actions"
		>
			<MoreHorizontal size={16} />
		</button>

		<!-- Popover dropdown -->
		{#if popoverOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute top-full right-0 mt-1 min-w-[11rem] py-1.5
					rounded-xl bg-[#2d2e2f] border border-white/[0.08]
					shadow-lg shadow-black/30 backdrop-blur-xl z-20"
				onclick={(e) => e.stopPropagation()}
			>
				<button class="popover-item" onclick={handleCopy}>
					{#if copyState === 'done'}
						<Check size={16} class="text-green-400 shrink-0" />
						<span class="text-green-400">Copied</span>
					{:else if copyState === 'error'}
						<Copy size={16} class="text-red-400 shrink-0" />
						<span class="text-red-400">Copy failed</span>
					{:else}
						<Copy size={16} class="shrink-0" />
						<span>Copy to clipboard</span>
					{/if}
				</button>

				<button class="popover-item" onclick={handleDownload}>
					<Download size={16} class="shrink-0" />
					<span>Download file</span>
				</button>

				<button class="popover-item" onclick={handleSaveArtifact}>
					<Sparkles size={16} class="shrink-0" />
					<span>Save as artifact</span>
				</button>

				<div class="my-1 mx-3 border-t border-white/[0.06]"></div>

				{#if expanded}
					<button class="popover-item" onclick={() => { expanded = false; popoverOpen = false; }}>
						<Minimize2 size={16} class="shrink-0" />
						<span>Collapse</span>
					</button>
				{:else}
					<button class="popover-item" onclick={() => { expanded = true; popoverOpen = false; }}>
						<Maximize2 size={16} class="shrink-0" />
						<span>Expand</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.popover-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: calc(100% - 8px);
		margin: 0 4px;
		padding: 7px 10px;
		border: none;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
		color: #c2c0b6;
		font-size: 13px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		transition: background 0.1s ease, color 0.1s ease;
		white-space: nowrap;
	}
	.popover-item:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #e4e6eb;
	}
</style>
