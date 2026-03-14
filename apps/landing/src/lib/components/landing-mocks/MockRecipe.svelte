<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLElement;
	let currentStep = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const steps = [
		{
			title: 'މަސް ފުނޑާލާ',
			content: 'ކައްކާފައި ހުރި މަސް\nރީއްޗަށް އަތުން ފުނޑާލާ.\nކަށި ހުރިތޯ ރަނގަޅަށް\nބަލާ ނަގާތި.\nމާ ބޮޑެތި ކޮށް\nނުބަހައްޓާތި'
		},
		{
			title: 'ހުނި ގާނާލާ',
			content: 'ކާށި ހުނި ތުނިކޮށް\nގާނާލާ.\nހުނީގެ ރަހަ ގަދަވާ\nވަރަށް ގާނާތި.\nބޯ ކިރު ފެލާ\nވަކިން ބަހައްޓާ'
		},
		{
			title: 'ފިޔާ ކޮށާލާ',
			content: 'ފިޔާ، ލޮނުމެދު،\nގިތެޔޮ މިރުސް ތުނިކޮށް\nކޮށާލާ.\nކަރަންފޫ ފަތްކޮޅެއް\nވެސް ކުދިކޮށް ކޮށާލާ.\nހިކި މިރުހެއް ވެސް އެޅިދާނެ'
		},
		{
			title: 'އެއްކޮށް މޮޑެލާ',
			content: 'ފުނޑާފައި ހުރި މަހާ،\nހުންޏާ، ފިޔާ އެއްކޮށް\nރީއްޗަށް މޮޑެލާ.\nލުނބޯ ހުތް ޖަހާ،\nލޮނު ހެޔޮވަރު ކޮށްލާ.\nރޮށްޓާ އެކު ކާން ތައްޔާރު'
		}
	];

	const completedSteps = $derived(new Set(
		Array.from({ length: currentStep }, (_, i) => i)
	));

	function startAnimation() {
		intervalId = setInterval(() => {
			currentStep = (currentStep + 1) % steps.length;
		}, 3000);
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
	<div class="px-4 py-5 flex flex-col gap-3 h-[195px] overflow-hidden">
		<!-- Step indicator -->
		<div class="thaana text-[7px] text-muted-foreground/50">
			ސްޓެޕް {currentStep + 1} / {steps.length}
		</div>

		<!-- Step header -->
		<div class="flex items-center gap-2">
			<div class="w-5 h-5 rounded-full flex items-center justify-center text-[7px] shrink-0 transition-colors duration-300 bg-primary/15 text-primary">
				{currentStep + 1}
			</div>
			<span class="thaana-heading text-[11px] text-foreground transition-opacity duration-300">
				{steps[currentStep].title}
			</span>
		</div>

		<!-- Step content -->
		<p class="thaana text-[9px] leading-[16px] text-foreground/80 transition-opacity duration-300 whitespace-pre-line">
			{steps[currentStep].content}
		</p>

		<!-- Progress dots -->
		<div class="flex items-center gap-1 mt-auto pt-2">
			{#each steps as _, idx}
				<div class="w-1.5 h-1.5 rounded-full transition-colors duration-300
					{idx === currentStep ? 'bg-primary' : completedSteps.has(idx) ? 'bg-green-500' : 'bg-muted-foreground/30'}">
				</div>
			{/each}
		</div>
	</div>
</div>
