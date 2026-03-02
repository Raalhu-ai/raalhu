<script lang="ts">
	import { onDestroy } from 'svelte';
	import { X, Check, CookingPot, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-svelte';
	import type { RecipeData } from '$lib/agent/types';

	let { data, servings, scaleFactor, onClose }: {
		data: RecipeData;
		servings: number;
		scaleFactor: number;
		onClose: () => void;
	} = $props();

	let screen = $state<'intro' | 'step'>('intro');
	let currentStep = $state(0);
	let completedSteps = $state<Set<number>>(new Set());

	let timerRunning = $state(false);
	let timerRemaining = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const UNIT_LABELS: Record<string, string> = {
		g: 'ގްރާމް', kg: 'ކިލޯ', oz: 'އައުންސް', lb: 'ޕައުންޑް',
		ml: 'މިލިލީޓަރ', l: 'ލީޓަރ', tsp: 'ސައިސަމުސާ', tbsp: 'މޭޒުމަތީ ސަމުސާ',
		cup: 'ޖޯޑު', fl_oz: 'ފުލުއިޑް އައުންސް', pinch: 'ޕިންޗް', piece: ''
	};

	function formatUnit(unit: string): string {
		return UNIT_LABELS[unit] ?? unit;
	}

	function scaleAmount(amount: number): string {
		const scaled = amount * scaleFactor;
		const frac = scaled % 1;
		if (Math.abs(frac - 0.25) < 0.01) return `${Math.floor(scaled) || ''}¼`.trim();
		if (Math.abs(frac - 0.33) < 0.02) return `${Math.floor(scaled) || ''}⅓`.trim();
		if (Math.abs(frac - 0.5) < 0.01) return `${Math.floor(scaled) || ''}½`.trim();
		if (Math.abs(frac - 0.67) < 0.02) return `${Math.floor(scaled) || ''}⅔`.trim();
		if (Math.abs(frac - 0.75) < 0.01) return `${Math.floor(scaled) || ''}¾`.trim();
		if (Number.isInteger(scaled)) return scaled.toString();
		return parseFloat(scaled.toFixed(2)).toString();
	}

	function resolveContent(content: string): string {
		return content.replace(/\{([^}]+)\}/g, (_, id) => {
			const ing = data.ingredients.find((i) => i.id === id);
			if (!ing) return `{${id}}`;
			const amt = scaleAmount(ing.amount);
			const unit = ing.unit ? ' ' + formatUnit(ing.unit) : '';
			return `${amt}${unit} ${ing.name}`;
		});
	}

	function formatTimerDisplay(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}

	function startCooking() {
		screen = 'step';
		currentStep = 0;
		initStepTimer();
	}

	function initStepTimer() {
		stopTimer();
		timerRemaining = 0;
	}

	function startTimer(seconds: number) {
		stopTimer();
		timerRemaining = seconds;
		timerRunning = true;
		timerInterval = setInterval(() => {
			timerRemaining--;
			if (timerRemaining <= 0) {
				timerRemaining = 0;
				stopTimer();
			}
		}, 1000);
	}

	function stopTimer() {
		timerRunning = false;
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function resetTimer(seconds: number) {
		stopTimer();
		timerRemaining = seconds;
	}

	function nextStep() {
		if (currentStep < data.steps.length - 1) {
			currentStep++;
			initStepTimer();
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
			initStepTimer();
		}
	}

	function toggleComplete(idx: number) {
		const next = new Set(completedSteps);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		completedSteps = next;
	}

	function close() {
		stopTimer();
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (screen !== 'step') return;
		if (e.key === 'ArrowRight') prevStep(); // RTL: right = prev
		if (e.key === 'ArrowLeft') nextStep();  // RTL: left = next
		if (e.key === 'Escape') close();
	}

	onDestroy(() => { stopTimer(); });
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 bg-background flex flex-col" style="font-family: var(--font-thaana);">

	<!-- Top bar -->
	<div class="flex items-center justify-between px-5 py-4 shrink-0">
		{#if screen === 'step'}
			<span class="thaana text-sm text-muted-foreground">
				ސްޓެޕް {currentStep + 1} / {data.steps.length}
			</span>
		{:else}
			<div></div>
		{/if}
		<button onclick={close}
			class="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/60 transition-colors">
			<X class="w-5 h-5 text-muted-foreground" />
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 flex items-center justify-center overflow-y-auto px-6">
		<div class="max-w-[560px] w-full">

			{#if screen === 'intro'}
				<div class="flex flex-col items-center text-center gap-5">
					<CookingPot class="w-10 h-10 text-primary" />
					<h2 class="thaana-heading text-2xl text-foreground">{data.title}</h2>
					{#if data.description}
						<p class="thaana text-sm text-muted-foreground max-w-md leading-relaxed">{data.description}</p>
					{/if}
					<div class="flex items-center gap-3 text-xs text-muted-foreground">
						<span>{data.steps.length} ސްޓެޕް</span>
						<span class="text-muted-foreground/40">·</span>
						<span>{servings} ސާވިންގ</span>
					</div>
					<button onclick={startCooking}
						class="mt-4 h-11 px-8 rounded-xl bg-primary text-primary-foreground font-medium
							hover:bg-primary/90 transition-colors active:scale-[0.985] thaana text-sm">
						ކެއްކަން ފަށާ
					</button>
				</div>

			{:else}
				{@const step = data.steps[currentStep]}
				<div class="flex flex-col gap-5" dir="rtl">
					<!-- Step header -->
					<div class="flex items-center gap-3">
						<button onclick={() => toggleComplete(currentStep)}
							class="flex shrink-0 w-9 h-9 rounded-full items-center justify-center transition-colors
								{completedSteps.has(currentStep) ? 'bg-green-500/20 text-green-400' : 'bg-primary/15 text-primary'}">
							{#if completedSteps.has(currentStep)}
								<Check class="w-4 h-4" />
							{:else}
								<span class="text-sm font-bold tabular-nums leading-none" style="font-family: system-ui, sans-serif">{currentStep + 1}</span>
							{/if}
						</button>
						<h3 class="thaana-heading text-xl text-foreground">{step.title}</h3>
					</div>

					<!-- Step content -->
					<p class="thaana text-[20px] leading-[48px] text-foreground/90">
						{resolveContent(step.content)}
					</p>

					<!-- Timer -->
					{#if step.timer_seconds}
						<div class="flex items-center gap-4 mt-2">
							<span class="text-2xl font-mono text-foreground tabular-nums" dir="ltr">
								{formatTimerDisplay(timerRemaining || step.timer_seconds)}
							</span>
							<div class="flex gap-2">
								{#if !timerRunning && timerRemaining === 0}
									<button onclick={() => startTimer(step.timer_seconds)}
										class="thaana h-8 px-3.5 rounded-lg bg-primary/15 text-primary text-xs
											hover:bg-primary/25 transition-colors flex items-center gap-1.5">
										<Play class="w-3 h-3" />
										ޓައިމަރ ފަށާ
									</button>
								{:else if timerRunning}
									<button onclick={stopTimer}
										class="thaana h-8 px-3.5 rounded-lg bg-destructive/15 text-destructive text-xs
											hover:bg-destructive/25 transition-colors flex items-center gap-1.5">
										<Pause class="w-3 h-3" />
										ހުއްޓާ
									</button>
								{:else}
									<button onclick={() => startTimer(timerRemaining)}
										class="thaana h-8 px-3.5 rounded-lg bg-primary/15 text-primary text-xs
											hover:bg-primary/25 transition-colors flex items-center gap-1.5">
										<Play class="w-3 h-3" />
										ކުރިއަށް
									</button>
									<button onclick={() => resetTimer(step.timer_seconds)}
										class="h-8 w-8 rounded-lg border border-muted-foreground/20 text-muted-foreground
											hover:bg-accent/60 transition-colors flex items-center justify-center">
										<RotateCcw class="w-3.5 h-3.5" />
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Bottom nav (step view only) -->
	{#if screen === 'step'}
		<div class="flex items-center justify-between px-6 py-5 shrink-0" dir="rtl">
			<button onclick={prevStep} disabled={currentStep === 0}
				class="thaana h-9 px-4 rounded-lg border border-muted-foreground/20 text-sm text-muted-foreground
					transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/60 flex items-center gap-1.5">
				<ChevronRight class="w-4 h-4" />
				ކުރީގެ
			</button>

			<!-- Step dots -->
			<div class="flex items-center gap-1.5">
				{#each data.steps as _, idx}
					<div class="w-1.5 h-1.5 rounded-full transition-colors
						{idx === currentStep ? 'bg-primary' : completedSteps.has(idx) ? 'bg-green-500' : 'bg-muted-foreground/30'}">
					</div>
				{/each}
			</div>

			{#if currentStep < data.steps.length - 1}
				<button onclick={nextStep}
					class="thaana h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium
						hover:bg-primary/90 transition-colors active:scale-[0.985] flex items-center gap-1.5">
					ދެން
					<ChevronLeft class="w-4 h-4" />
				</button>
			{:else}
				<button onclick={close}
					class="thaana h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-medium
						hover:bg-green-500 transition-colors active:scale-[0.985]">
					ނިމިއްޖެ
				</button>
			{/if}
		</div>
	{/if}
</div>
