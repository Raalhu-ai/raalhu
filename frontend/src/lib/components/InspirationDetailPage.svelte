<script lang="ts">
	import { ArrowRight, Waves, Copy, Check, RotateCw, ExternalLink } from 'lucide-svelte';
	import type { InspirationCard } from '$lib/inspiration-cards';
	import { inspirationPreviews } from '$lib/inspiration-previews';

	let {
		card,
		onBack,
		onUse
	}: {
		card: InspirationCard;
		onBack: () => void;
		onUse: (prompt: string) => void;
	} = $props();

	let copied = $state(false);
	let previewHtml = $derived(inspirationPreviews[card.id] ?? '');
	let iframeKey = $state(0);

	function refreshPreview() {
		iframeKey++;
	}

	function openInNewTab() {
		const blob = new Blob([previewHtml], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}

	function copyPrompt() {
		navigator.clipboard.writeText(card.prompt);
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}
</script>

<div class="flex-1 overflow-y-auto">
	<div class="max-w-4xl mx-auto px-6 py-8 lg:py-12" dir="rtl">
		<!-- Back button -->
		<button
			onclick={onBack}
			class="thaana flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground
				transition-colors duration-150 mb-8"
		>
			<ArrowRight class="w-4 h-4" />
			ފަހަތަށް
		</button>

		<!-- Creator badge -->
		<div class="flex items-center gap-2 mb-4">
			<Waves class="w-5 h-5 text-primary" />
			<span class="thaana text-sm text-muted-foreground">ރާޅު</span>
		</div>

		<!-- Title + description + Use button -->
		<div class="flex items-start justify-between gap-4 mb-8">
			<div>
				<h1 class="thaana text-2xl text-white font-semibold mb-1.5">{card.title}</h1>
				<p class="thaana text-sm text-muted-foreground/70">{card.description}</p>
			</div>
			<button
				onclick={() => onUse(card.prompt)}
				class="thaana shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg
					bg-foreground text-background hover:bg-foreground/90 transition-colors duration-150"
			>
				ބޭނުންކުރޭ
			</button>
		</div>

		<!-- Preview panel -->
		<div class="rounded-2xl border border-border overflow-hidden bg-card mb-10">
			<!-- Panel top bar -->
			<div class="h-10 border-b border-border/50 bg-accent/20 flex items-center justify-end gap-1 px-3">
				<button
					onclick={refreshPreview}
					class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40
						transition-colors duration-150"
					title="ރިފްރެޝް"
				>
					<RotateCw class="w-3.5 h-3.5" />
				</button>
				<button
					onclick={openInNewTab}
					class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40
						transition-colors duration-150"
					title="އާ ޓެބެއްގައި ހުޅުވާ"
				>
					<ExternalLink class="w-3.5 h-3.5" />
				</button>
			</div>

			<!-- Live preview iframe -->
			{#if previewHtml}
				{#key iframeKey}
					<iframe
						srcdoc={previewHtml}
						title={card.title}
						class="w-full bg-white"
						style="height: 500px; border: none;"
						sandbox="allow-scripts allow-same-origin"
					></iframe>
				{/key}
			{:else}
				<div class="bg-white p-8 min-h-[300px] flex flex-col items-center justify-center gap-4">
					<h2 class="text-2xl font-bold text-gray-900">{card.title}</h2>
					<p class="text-sm text-gray-500 text-center max-w-md">{card.description}</p>
				</div>
			{/if}
		</div>

		<!-- About section -->
		<div class="mb-12">
			<h3 class="thaana text-sm font-medium text-muted-foreground mb-4">ތަފްސީލް</h3>

			<div class="rounded-xl border border-border p-5">
				<div class="flex items-center justify-between mb-3">
					<span class="thaana text-sm font-semibold text-foreground">ސްޓާޓިން ޕްރޮމްޕްޓް</span>
					<button
						onclick={copyPrompt}
						class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent
							transition-colors duration-150"
						title="ކޮޕީ ކުރޭ"
					>
						{#if copied}
							<Check class="w-4 h-4 text-green-500" />
						{:else}
							<Copy class="w-4 h-4" />
						{/if}
					</button>
				</div>
				<p class="thaana text-sm text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{card.prompt}</p>
			</div>
		</div>
	</div>
</div>
