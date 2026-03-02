<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let step = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const models = ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'Gemini 3 Flash'];

	const currentModel = $derived(models[step % models.length]);
	const showFile = $derived(step % 6 >= 3);
	const fileVisible = $derived(step % 6 >= 4);

	function startAnimation() {
		intervalId = setInterval(() => {
			step = step + 1;
		}, 1500);
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !intervalId) {
					startAnimation();
				}
			},
			{ threshold: 0.3 }
		);
		observer.observe(container);
		return () => observer.disconnect();
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div bind:this={container} class="rounded-lg bg-[#1a1a1a] border border-[#333] overflow-hidden shadow-lg w-full" dir="ltr">
	<!-- Model selector bar -->
	<div class="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333]">
		<svg class="w-3 h-3 text-primary/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
		</svg>
		<span class="text-[9px] text-foreground font-mono transition-all duration-300">
			{currentModel}
		</span>
		<svg class="w-2.5 h-2.5 text-muted-foreground/40 ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="m6 9 6 6 6-6" />
		</svg>
	</div>
	<!-- Content area -->
	<div class="p-3 min-h-[110px]">
		{#if showFile}
			<!-- File attachment -->
			<div
				class="flex items-center gap-2 p-2 rounded-lg bg-[#252525] border border-[#333] transition-all duration-500"
				style="opacity: {fileVisible ? 1 : 0}; transform: translateY({fileVisible ? 0 : 8}px)"
			>
				<svg class="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
				</svg>
				<div class="flex-1 min-w-0">
					<div class="h-1.5 w-16 bg-foreground/20 rounded mb-1"></div>
					<div class="h-1 w-10 bg-muted-foreground/20 rounded"></div>
				</div>
				<div class="w-8 h-8 rounded bg-primary/10 shrink-0 flex items-center justify-center">
					<svg class="w-3.5 h-3.5 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
					</svg>
				</div>
			</div>
		{:else}
			<!-- Chat bubbles -->
			<div class="space-y-2">
				<div class="flex justify-end">
					<div class="bg-primary/10 rounded-lg px-2.5 py-1.5 max-w-[80%]">
						<div class="h-1 w-20 bg-primary/20 rounded mb-1"></div>
						<div class="h-1 w-14 bg-primary/20 rounded"></div>
					</div>
				</div>
				<div class="flex justify-start">
					<div class="bg-[#252525] rounded-lg px-2.5 py-1.5 max-w-[85%]">
						<div class="h-1 w-24 bg-foreground/15 rounded mb-1"></div>
						<div class="h-1 w-20 bg-foreground/15 rounded mb-1"></div>
						<div class="h-1 w-16 bg-foreground/15 rounded"></div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
