<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let step = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const bodyLines = [
		'އައްސަލާމު ޢަލައިކުމް،',
		'މިސިޓީ ލިޔަނީ ވަޒީފާއަށް އެދި.',
		'އަޅުގަނޑަކީ ކޮމްޕިއުޓަރ ސައިންސް',
		'ދާއިރާއިން ޑިގްރީ ހާސިލުކޮށްފައިވާ',
		'ފަރާތެއް ކަމުގައި ދެންނެވީމެވެ.'
	];

	const totalSteps = bodyLines.length + 3;
	const visibleBody = $derived(bodyLines.slice(0, Math.max(0, step - 1)));
	const showTitle = $derived(step >= 1);
	const showDownload = $derived(step > bodyLines.length + 1);
	const boldActive = $derived(step > 2);
	const italicActive = $derived(step > 4);

	function startAnimation() {
		intervalId = setInterval(() => {
			step = step + 1;
			if (step > totalSteps + 2) {
				step = 0;
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

<div bind:this={container} class="rounded-lg bg-[rgba(30,30,30,0.85)] border border-[#333] overflow-hidden shadow-lg w-full backdrop-blur-sm" dir="rtl">
	<!-- Toolbar -->
	<div class="flex items-center gap-2 px-3 py-1.5 bg-[rgba(37,37,37,0.85)] border-b border-[#333]">
		<div class="flex gap-1">
			<div class="w-4 h-3 rounded-sm transition-colors duration-300 {boldActive ? 'bg-primary/40' : 'bg-[#444]'}"></div>
			<div class="w-4 h-3 rounded-sm transition-colors duration-300 {italicActive ? 'bg-primary/40' : 'bg-[#444]'}"></div>
			<div class="w-4 h-3 rounded-sm bg-[#444]"></div>
		</div>
		<div class="ms-auto flex items-center gap-1">
			<svg class="w-3 h-3 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			<span class="text-[8px] text-muted-foreground/50 font-mono" dir="ltr">DOCX</span>
		</div>
	</div>
	<!-- Document page -->
	<div class="p-4 h-[170px] overflow-hidden">
		{#if showTitle}
			<div class="thaana-heading text-sm mb-2 text-foreground">ރަސްމީ ސިޓީ</div>
		{/if}
		{#each visibleBody as line}
			<div class="thaana text-[10px] text-muted-foreground leading-[1.8]">{line}</div>
		{/each}
		{#if step > 0 && step <= bodyLines.length + 1}
			<span class="inline-block w-0.5 h-2.5 bg-primary animate-pulse"></span>
		{/if}
		{#if showDownload}
			<div class="mt-3 pt-2 border-t border-[#333] flex justify-center">
				<div class="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[8px] thaana">
					ޑައުންލޯޑް
				</div>
			</div>
		{/if}
	</div>
</div>
