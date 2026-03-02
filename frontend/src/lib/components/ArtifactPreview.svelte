<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Download, RotateCw, Loader2, FileText } from 'lucide-svelte';
	import type { Artifact } from '$lib/agent/types';

	let {
		artifact,
		onClose,
		onDownload
	}: {
		artifact: Artifact;
		onClose: () => void;
		onDownload: () => void;
	} = $props();

	type PreviewType = 'docx' | 'xlsx' | 'pdf' | 'image' | 'text' | 'none';

	let previewType = $state<PreviewType>('none');
	let loading = $state(true);
	let rendering = $state(false);
	let error = $state('');

	// DOCX: docx-preview renders into a DOM container
	let docxContainer = $state<HTMLDivElement>();
	let docxBuffer = $state<ArrayBuffer | null>(null);

	// XLSX/CSV: SheetJS parsed sheets
	let xlsxSheets = $state<{ name: string; html: string }[]>([]);
	let xlsxActiveSheet = $state(0);

	// Text/code
	let textContent = $state('');

	// Track scroll container height for docx min-height
	let scrollRoot = $state<HTMLDivElement>();
	let scrollRootHeight = $state(0);

	onMount(() => {
		if (!scrollRoot) return;
		const ro = new ResizeObserver(([entry]) => {
			scrollRootHeight = entry.contentRect.height;
		});
		ro.observe(scrollRoot);
		return () => ro.disconnect();
	});

	function getExt(filename: string): string {
		return filename.split('.').pop()?.toLowerCase() || '';
	}

	function getTypeLabel(filename: string, _mimeType: string): string {
		return getExt(filename).toUpperCase();
	}

	// Load preview data when artifact changes
	$effect(() => {
		const _art = artifact;
		loadPreview(_art);
	});

	// Render DOCX when container becomes available after previewType is set
	$effect(() => {
		if (docxContainer && docxBuffer && previewType === 'docx') {
			rendering = true;
			renderDocx(docxContainer, docxBuffer)
				.catch((err) => {
					error = err.message || 'DOCX render failed';
				})
				.finally(() => {
					rendering = false;
				});
		}
	});

	async function loadPreview(art: Artifact) {
		loading = true;
		error = '';
		docxBuffer = null;
		xlsxSheets = [];
		xlsxActiveSheet = 0;
		textContent = '';
		previewType = 'none';

		const ext = getExt(art.filename);
		const mime = art.mimeType;

		try {
			if (['docx', 'doc'].includes(ext)) {
				const res = await fetch(art.url);
				docxBuffer = await res.arrayBuffer();
				previewType = 'docx';
			} else if (['xlsx', 'xls'].includes(ext)) {
				const XLSX = await import('xlsx');
				const res = await fetch(art.url);
				const buf = await res.arrayBuffer();
				const wb = XLSX.read(buf, { type: 'array' });
				xlsxSheets = wb.SheetNames.map((name) => ({
					name,
					html: XLSX.utils.sheet_to_html(wb.Sheets[name])
				}));
				previewType = 'xlsx';
			} else if (ext === 'csv') {
				const XLSX = await import('xlsx');
				const res = await fetch(art.url);
				const text = await res.text();
				const wb = XLSX.read(text, { type: 'string' });
				xlsxSheets = wb.SheetNames.map((name) => ({
					name,
					html: XLSX.utils.sheet_to_html(wb.Sheets[name])
				}));
				previewType = 'xlsx';
			} else if (ext === 'pdf') {
				previewType = 'pdf';
			} else if (mime.startsWith('image/')) {
				previewType = 'image';
			} else if (
				mime.startsWith('text/') ||
				['txt', 'json', 'md', 'py', 'js', 'html', 'xml'].includes(ext)
			) {
				const res = await fetch(art.url);
				textContent = await res.text();
				previewType = 'text';
			} else {
				previewType = 'none';
			}
		} catch (err: any) {
			error = err.message || 'Preview failed';
		} finally {
			loading = false;
		}
	}

	async function renderDocx(container: HTMLDivElement, buffer: ArrayBuffer) {
		const { renderAsync } = await import('docx-preview');
		container.innerHTML = '';
		await renderAsync(buffer, container, undefined, {
			className: 'docx',
			inWrapper: true,
			ignoreWidth: true,
			ignoreHeight: true,
			ignoreFonts: false,
			breakPages: false,
			renderHeaders: true,
			renderFooters: true,
			renderFootnotes: true,
			renderEndnotes: true
		});
	}

	function switchSheet(idx: number) {
		xlsxActiveSheet = idx;
	}
</script>

<div class="flex flex-col h-full bg-background">
	<!-- Header -->
	<div class="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
		<div class="flex-1 min-w-0 pr-4 truncate">
			<span class="thaana text-sm font-medium text-foreground">{artifact.label}</span>
			<span class="text-sm text-muted-foreground"> · {getTypeLabel(artifact.filename, artifact.mimeType)}</span>
		</div>
		<button
			onclick={onDownload}
			class="p-1.5 rounded-sm border border-white/20 bg-muted/60 hover:bg-black hover:border-black text-muted-foreground hover:text-foreground transition-colors"
			title="Download"
		>
			<Download class="w-3.5 h-3.5" />
		</button>
		<button
			onclick={() => loadPreview(artifact)}
			class="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			title="Refresh"
		>
			<RotateCw class="w-3.5 h-3.5" />
		</button>
		<button
			onclick={onClose}
			class="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
			title="Close"
		>
			<X class="w-3.5 h-3.5" />
		</button>
	</div>

	<!-- Preview body -->
	<div bind:this={scrollRoot} class="flex-1 overflow-auto relative min-h-0">
		{#if loading || rendering}
			<div class="flex items-center justify-center h-full">
				<Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
				<span class="thaana text-sm">ފައިލް ލޯޑެއް ނުކުރެވުނު</span>
				<button
					onclick={onDownload}
					class="thaana px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
				>
					ޑައުންލޯޑް
				</button>
			</div>
		{/if}

		<!-- DOCX: docx-preview renders into this container -->
		{#if previewType === 'docx'}
			<div
				bind:this={docxContainer}
				class="docx-host"
				style="min-height: {scrollRootHeight}px"
				class:hidden={loading || rendering || !!error}
			></div>
		{/if}

		<!-- XLSX / CSV: sheet tabs + HTML table -->
		{#if previewType === 'xlsx' && !loading && !error}
			{#if xlsxSheets.length > 1}
				<div class="sticky top-0 z-10 flex gap-0.5 px-3 pt-2 pb-1 bg-background border-b border-border">
					{#each xlsxSheets as sheet, idx}
						<button
							onclick={() => switchSheet(idx)}
							class="px-3 py-1.5 text-xs rounded-t-md transition-colors {idx === xlsxActiveSheet
								? 'bg-muted text-foreground font-medium'
								: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
						>
							{sheet.name}
						</button>
					{/each}
				</div>
			{/if}
			<div class="xlsx-host p-4 overflow-auto">
				{@html xlsxSheets[xlsxActiveSheet]?.html || ''}
			</div>
		{/if}

		<!-- PDF: native browser rendering -->
		{#if previewType === 'pdf' && !loading && !error}
			<iframe
				src={artifact.url}
				class="w-full h-full border-0"
				title={artifact.label}
			></iframe>
		{/if}

		<!-- Image -->
		{#if previewType === 'image' && !loading && !error}
			<div class="flex items-center justify-center p-6 h-full">
				<img
					src={artifact.url}
					alt={artifact.label}
					class="max-w-full max-h-full object-contain rounded"
				/>
			</div>
		{/if}

		<!-- Text / Code -->
		{#if previewType === 'text' && !loading && !error}
			<div class="p-5">
				<pre class="text-sm text-foreground font-mono whitespace-pre-wrap leading-relaxed">{textContent}</pre>
			</div>
		{/if}

		<!-- Unsupported -->
		{#if previewType === 'none' && !loading && !error}
			<div class="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
				<FileText class="w-12 h-12 opacity-40" />
				<span class="text-sm">Preview not available</span>
				<button
					onclick={onDownload}
					class="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
				>
					Download
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	/* docx host: fill the scroll container */
	:global(.docx-host) {
		display: flex;
		flex-direction: column;
	}

	/* docx-preview: page wrapper styling */
	:global(.docx-host .docx-wrapper) {
		background: #e8e8e8;
		padding: 20px;
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	:global(.docx-host .docx-wrapper > section.docx) {
		background: white;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
		margin: 0 auto 20px;
		flex: 1;
		width: 100%;
	}

	/* xlsx: table styling */
	:global(.xlsx-host table) {
		border-collapse: collapse;
		width: 100%;
		font-size: 13px;
	}

	:global(.xlsx-host th),
	:global(.xlsx-host td) {
		border: 1px solid oklch(0.35 0 0);
		padding: 5px 10px;
		text-align: start;
		white-space: nowrap;
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
		color: oklch(0.9 0 0);
	}

	:global(.xlsx-host th) {
		background: oklch(0.22 0 0);
		font-weight: 600;
		color: oklch(0.7 0 0);
	}

	:global(.xlsx-host tr:nth-child(even) td) {
		background: oklch(0.16 0 0);
	}

	:global(.xlsx-host tr:hover td) {
		background: oklch(0.2 0.01 180);
	}
</style>
