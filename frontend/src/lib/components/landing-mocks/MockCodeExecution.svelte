<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let step = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const codeLines = [
		{ text: '# fibonacci.py', color: '#676e95' },
		{ text: 'def fib(n):', color: '#c792ea' },
		{ text: '    a, b = 0, 1', color: '#eee' },
		{ text: '    for _ in range(n):', color: '#c792ea' },
		{ text: '        a, b = b, a + b', color: '#eee' },
		{ text: '    return a', color: '#eee' },
		{ text: '', color: '' },
		{ text: 'print(fib(10))', color: '#82aaff' }
	];

	const totalSteps = codeLines.length + 3;

	const visibleLines = $derived(codeLines.slice(0, Math.min(step, codeLines.length)));
	const showOutput = $derived(step > codeLines.length + 1);

	function startAnimation() {
		intervalId = setInterval(() => {
			step = step + 1;
			if (step > totalSteps + 2) {
				step = 0;
			}
		}, 600);
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

<div bind:this={container} class="rounded-lg bg-[rgba(26,26,26,0.85)] border border-[#333] overflow-hidden shadow-lg w-full backdrop-blur-sm" dir="ltr">
	<!-- Title bar -->
	<div class="flex items-center gap-1.5 px-3 py-2 bg-[rgba(37,37,37,0.85)] border-b border-[#333]">
		<div class="w-2.5 h-2.5 rounded-full bg-[#ff5f57]"></div>
		<div class="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
		<div class="w-2.5 h-2.5 rounded-full bg-[#28c840]"></div>
		<span class="ml-2 text-[9px] text-[#888] font-mono">python</span>
	</div>
	<!-- Code area -->
	<div class="p-3 font-mono text-[10px] leading-[1.7] h-[175px] overflow-hidden">
		{#each visibleLines as line}
			<div style="color: {line.color}">{line.text || '\u00A0'}</div>
		{/each}
		{#if showOutput}
			<div class="mt-2 pt-2 border-t border-[#333]">
				<span class="text-[#82aaff]">Output: </span>
				<span class="text-[#28c840]">55</span>
			</div>
		{/if}
		{#if step <= codeLines.length}
			<span class="inline-block w-1.5 h-3 bg-[#888] animate-pulse"></span>
		{/if}
	</div>
</div>
