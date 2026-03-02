<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let visibleCount = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const results = [
		{ titleWidth: '75%', lineWidth: '100%', line2Width: '60%' },
		{ titleWidth: '65%', lineWidth: '90%', line2Width: '70%' },
		{ titleWidth: '80%', lineWidth: '85%', line2Width: '55%' },
		{ titleWidth: '55%', lineWidth: '95%', line2Width: '65%' }
	];

	function startAnimation() {
		intervalId = setInterval(() => {
			visibleCount = visibleCount + 1;
			if (visibleCount > results.length + 3) {
				visibleCount = 0;
			}
		}, 700);
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
	<!-- Search bar -->
	<div class="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333]">
		<svg class="w-3 h-3 text-muted-foreground/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
		</svg>
		<div class="flex-1 h-2 bg-[#333] rounded"></div>
	</div>
	<!-- Results -->
	<div class="p-2.5 space-y-2.5 min-h-[120px]">
		{#each results as result, i}
			{@const visible = i < visibleCount}
			<div
				class="transition-all duration-400 ease-out"
				style="opacity: {visible ? 1 : 0}; transform: translateY({visible ? 0 : 8}px)"
			>
				<div class="h-1.5 rounded mb-1 bg-primary/30" style="width: {result.titleWidth}"></div>
				<div class="h-1 rounded mb-0.5 bg-[#333]" style="width: {result.lineWidth}"></div>
				<div class="h-1 rounded bg-[#333]" style="width: {result.line2Width}"></div>
			</div>
		{/each}
	</div>
</div>
