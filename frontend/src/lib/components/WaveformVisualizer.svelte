<script lang="ts">
	let {
		getFrequencyData,
		barCount = 24,
		active = true,
	}: {
		getFrequencyData: () => Uint8Array | null;
		barCount?: number;
		active?: boolean;
	} = $props();

	let barHeights = $state<number[]>(new Array(barCount).fill(0.1));

	$effect(() => {
		if (!active) return;

		let frameId: number;

		function tick() {
			const data = getFrequencyData();
			if (data) {
				const bins = data.length;
				const newHeights: number[] = [];
				for (let i = 0; i < barCount; i++) {
					const idx = Math.floor((i / barCount) * bins);
					const normalized = data[idx] / 255;
					newHeights.push(Math.max(0.08, normalized));
				}
				barHeights = newHeights;
			}
			frameId = requestAnimationFrame(tick);
		}

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	});
</script>

<div class="flex items-center justify-center gap-[3px] h-10 w-full" dir="ltr">
	{#each barHeights as h}
		<div
			class="w-[3px] rounded-full bg-primary transition-[height] duration-[60ms] ease-out"
			style="height: {Math.max(12, h * 100)}%"
		></div>
	{/each}
</div>
