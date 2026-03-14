<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let charIndex = $state(0);
	let messageIndex = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const messages = [
		'އައްސަލާމު ޢަލައިކުމް، މިސިޓީ ލިޔަނީ ވަޒީފާއަށް އެދި ހުށައެޅުމުގެ ގޮތުން.',
		'ޝުކުރިއްޔާ، ބައްދަލުވުން ކެންސަލް ވީ ވާހަކަ ދެންނެވީމެވެ.'
	];

	const currentMessage = $derived(messages[messageIndex]);
	const typedText = $derived(currentMessage.slice(0, charIndex));

	function startAnimation() {
		intervalId = setInterval(() => {
			if (charIndex < currentMessage.length) {
				charIndex = charIndex + 1;
			} else {
				// Pause then reset to next message
				clearInterval(intervalId!);
				setTimeout(() => {
					charIndex = 0;
					messageIndex = (messageIndex + 1) % messages.length;
					intervalId = setInterval(() => {
						if (charIndex < messages[(messageIndex) % messages.length].length) {
							charIndex = charIndex + 1;
						} else {
							clearInterval(intervalId!);
							setTimeout(() => {
								charIndex = 0;
								messageIndex = (messageIndex + 1) % messages.length;
								startAnimation();
							}, 2000);
						}
					}, 60);
				}, 2000);
			}
		}, 60);
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

<div bind:this={container} class="rounded-lg bg-[#1e1e1e] border border-[#333] overflow-hidden shadow-lg w-full" dir="rtl">
	<!-- Style tabs -->
	<div class="flex gap-1 p-1.5 border-b border-[#333]">
		<div class="px-2 py-1 rounded-full bg-primary/10 border border-primary/25">
			<span class="text-[7px] text-primary thaana">ރަސްމީ</span>
		</div>
		<div class="px-2 py-1 rounded-full border border-transparent">
			<span class="text-[7px] text-muted-foreground thaana">އާދައިގެ</span>
		</div>
		<div class="px-2 py-1 rounded-full border border-transparent">
			<span class="text-[7px] text-muted-foreground thaana">އެކުވެރި</span>
		</div>
	</div>
	<!-- Message body -->
	<div class="p-3 min-h-[90px]">
		<p class="thaana text-[9px] text-foreground leading-[1.9]">
			{typedText}<span class="inline-block w-0.5 h-2.5 bg-primary animate-pulse"></span>
		</p>
	</div>
	<!-- Action bar -->
	<div class="flex items-center justify-end gap-1.5 px-2 py-1.5 border-t border-[#333]">
		<div class="w-5 h-5 rounded border border-[#444] flex items-center justify-center">
			<svg class="w-2.5 h-2.5 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
			</svg>
		</div>
	</div>
</div>
