<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Minus, Plus, Copy, Check, CookingPot, Play, Pause, Printer } from 'lucide-svelte';
	import type { RecipeData } from '$lib/agent/types';
	import RecipeCookingMode from './RecipeCookingMode.svelte';

	let { data }: { data: RecipeData } = $props();

	const baseServings = data.base_servings || 4;
	let servings = $state(baseServings);
	let copied = $state(false);
	let cookingMode = $state(false);
	let completedSteps = $state<Set<number>>(new Set());

	function toggleStep(idx: number) {
		const next = new Set(completedSteps);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		completedSteps = next;
	}

	const scaleFactor = $derived(servings / baseServings);

	const UNIT_LABELS: Record<string, string> = {
		g: 'ގްރާމް',
		kg: 'ކިލޯ',
		oz: 'އައުންސް',
		lb: 'ޕައުންޑް',
		ml: 'މިލިލީޓަރ',
		l: 'ލީޓަރ',
		tsp: 'ސައިސަމުސާ',
		tbsp: 'މޭޒުމަތީ ސަމުސާ',
		cup: 'ޖޯޑު',
		fl_oz: 'ފުލުއިޑް އައުންސް',
		pinch: 'ޕިންޗް',
		piece: ''
	};

	function formatUnit(unit: string): string {
		return UNIT_LABELS[unit] ?? unit;
	}

	function scaleAmount(amount: number): string {
		const scaled = amount * scaleFactor;
		// Common fractions
		const frac = scaled % 1;
		if (Math.abs(frac - 0.25) < 0.01) return `${Math.floor(scaled) || ''}¼`.trim();
		if (Math.abs(frac - 0.33) < 0.02) return `${Math.floor(scaled) || ''}⅓`.trim();
		if (Math.abs(frac - 0.5) < 0.01) return `${Math.floor(scaled) || ''}½`.trim();
		if (Math.abs(frac - 0.67) < 0.02) return `${Math.floor(scaled) || ''}⅔`.trim();
		if (Math.abs(frac - 0.75) < 0.01) return `${Math.floor(scaled) || ''}¾`.trim();
		// Clean number
		if (Number.isInteger(scaled)) return scaled.toString();
		return parseFloat(scaled.toFixed(2)).toString();
	}

	function ingredientById(id: string) {
		return data.ingredients.find((i) => i.id === id);
	}

	function resolveContent(content: string): string {
		return content.replace(/\{([^}]+)\}/g, (_, id) => {
			const ing = ingredientById(id);
			if (!ing) return `{${id}}`;
			const amt = scaleAmount(ing.amount);
			const unit = ing.unit ? ' ' + formatUnit(ing.unit) : '';
			return `${amt}${unit} ${ing.name}`;
		});
	}

	function formatTimer(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}

	function copyRecipe() {
		const lines: string[] = [];
		lines.push(data.title);
		if (data.description) lines.push(data.description);
		lines.push('');
		lines.push(`ސާވިންގ: ${servings}`);
		lines.push('');
		lines.push('ބާވަތްތައް:');
		for (const ing of data.ingredients) {
			const amt = scaleAmount(ing.amount);
			const unit = ing.unit ? ' ' + formatUnit(ing.unit) : '';
			lines.push(`  - ${amt}${unit} ${ing.name}`);
		}
		lines.push('');
		lines.push('ސްޓެޕްތައް:');
		data.steps.forEach((step, idx) => {
			lines.push(`${idx + 1}. ${step.title}: ${resolveContent(step.content)}`);
		});
		if (data.notes) {
			lines.push('');
			lines.push(`ނޯޓްސް: ${data.notes}`);
		}
		navigator.clipboard.writeText(lines.join('\n'));
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}

	function printRecipe() {
		const w = window.open('', '_blank');
		if (!w) return;
		const ingredients = data.ingredients.map((ing) => {
			const amt = scaleAmount(ing.amount);
			const unit = ing.unit ? ' ' + formatUnit(ing.unit) : '';
			return `<li>${amt}${unit} ${ing.name}</li>`;
		}).join('');
		const steps = data.steps.map((step, idx) => {
			return `<li><strong>${step.title}:</strong> ${resolveContent(step.content)}</li>`;
		}).join('');
		w.document.write(`<!DOCTYPE html><html dir="rtl" lang="dv"><head><meta charset="utf-8"><title>${data.title}</title>
<style>
@font-face{font-family:"MV Typewriter";src:url("/fonts/mvtyper.ttf") format("truetype");font-weight:400}
@font-face{font-family:"MV Typewriter";src:url("/fonts/mvtypebold.ttf") format("truetype");font-weight:700}
@font-face{font-family:"Sangu Suruhee";src:url("/fonts/SanguSuruhee-Regular.woff2") format("woff2"),url("/fonts/SanguSuruhee-Regular.woff") format("woff");font-weight:400}
body{font-family:"MV Typewriter",sans-serif;max-width:600px;margin:40px auto;line-height:1.8;color:#111}
h1,h2{font-family:"Sangu Suruhee","MV Typewriter",sans-serif}
h1{font-size:4.2em;margin-bottom:4px;font-weight:normal}h2{font-size:3em;font-weight:normal}p.desc{color:#555;margin-top:0}
.meta{font-size:0.9em;color:#666;margin-bottom:16px}
ul,ol{padding-right:20px}li{margin-bottom:6px}
.notes{margin-top:20px;padding:12px;background:#f5f5f5;border-radius:8px;font-size:0.9em}
@media print{body{margin:20px}}
</style></head><body>
<h1>${data.title}</h1>
${data.description ? `<p class="desc">${data.description}</p>` : ''}
<div class="meta">ސާވިންގ: ${servings}</div>
<h2>ބާވަތްތައް</h2><ul>${ingredients}</ul>
<h2>ސްޓެޕްތައް</h2><ol>${steps}</ol>
${data.notes ? `<div class="notes"><strong>ނޯޓްސް:</strong> ${data.notes}</div>` : ''}
</body></html>`);
		w.document.close();
	}

	// Per-step timers
	let timerRemaining = $state<number[]>(data.steps.map((s) => s.timer_seconds || 0));
	let timerRunning = $state<boolean[]>(data.steps.map(() => false));
	const timerIntervals: (ReturnType<typeof setInterval> | null)[] = data.steps.map(() => null);

	function toggleTimer(idx: number, seconds: number) {
		if (timerRunning[idx]) {
			timerRunning[idx] = false;
			timerRemaining[idx] = seconds;
			if (timerIntervals[idx]) {
				clearInterval(timerIntervals[idx]!);
				timerIntervals[idx] = null;
			}
		} else {
			timerRunning[idx] = true;
			timerIntervals[idx] = setInterval(() => {
				timerRemaining[idx]--;
				if (timerRemaining[idx] <= 0) {
					timerRemaining[idx] = 0;
					timerRunning[idx] = false;
					clearInterval(timerIntervals[idx]!);
					timerIntervals[idx] = null;
				}
			}, 1000);
		}
	}

	onDestroy(() => {
		timerIntervals.forEach((id) => { if (id) clearInterval(id); });
	});

	function decrement() {
		if (servings > 1) servings--;
	}

	function increment() {
		if (servings < 100) servings++;
	}
</script>

<div class="rounded-2xl overflow-hidden border border-muted-foreground/20 bg-muted/50"
	style="font-family: var(--font-thaana);">

	<!-- Header -->
	<div class="px-5 pt-5 pb-3">
		<h3 class="thaana text-lg font-bold text-foreground">{data.title}</h3>
		{#if data.description}
			<p class="thaana text-sm text-muted-foreground mt-1.5 leading-relaxed">{data.description}</p>
		{/if}
	</div>

	<!-- Servings control -->
	<div class="flex items-center gap-3 px-5 py-2.5 border-t border-b border-muted-foreground/15">
		<span class="thaana text-xs text-muted-foreground">ސާވިންގ</span>
		<div class="flex items-center rounded-lg border border-muted-foreground/20 overflow-hidden">
			<button onclick={decrement} disabled={servings <= 1}
				class="h-7 w-7 flex items-center justify-center hover:bg-accent/60 transition-colors
					text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed">
				<Minus class="w-3 h-3" />
			</button>
			<span class="w-8 text-center text-sm font-medium text-foreground tabular-nums">{servings}</span>
			<button onclick={increment} disabled={servings >= 100}
				class="h-7 w-7 flex items-center justify-center hover:bg-accent/60 transition-colors
					text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed">
				<Plus class="w-3 h-3" />
			</button>
		</div>
	</div>

	<!-- Ingredients -->
	<div class="px-5 py-3">
		<h4 class="thaana text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">ބާވަތްތައް</h4>
		<ul class="flex flex-col gap-1">
			{#each data.ingredients as ing}
				<li class="thaana text-sm text-foreground">
					<span class="tabular-nums" dir="ltr">{scaleAmount(ing.amount)}</span>{ing.unit ? ' ' + formatUnit(ing.unit) : ''} {ing.name}
				</li>
			{/each}
		</ul>
	</div>

	<div class="h-px bg-muted-foreground/15 mx-5"></div>

	<!-- Steps -->
	<div class="px-5 py-3">
		<h4 class="thaana text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-3">ސްޓެޕްތައް</h4>
		<div class="flex flex-col gap-4">
			{#each data.steps as step, idx}
				{@const done = completedSteps.has(idx)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="flex items-start gap-3 cursor-pointer transition-opacity {done ? 'opacity-60' : ''}"
					onclick={() => toggleStep(idx)}>
					<button
						class="flex shrink-0 w-6 h-6 rounded-full items-center justify-center mb-2 transition-all
							{done ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}"
						aria-label={done ? 'Mark as incomplete' : 'Mark as complete'}
					>
						{#if done}
							<Check class="w-3.5 h-3.5" />
						{:else}
							<span class="text-[11px] font-bold tabular-nums leading-none relative -top-px" style="font-family: system-ui, sans-serif">{idx + 1}</span>
						{/if}
					</button>
					<div class="flex-1 min-w-0 {done ? 'line-through decoration-muted-foreground/50' : ''}">
						<span class="thaana text-sm font-bold text-foreground">{step.title}: </span>
						<span class="thaana text-sm text-muted-foreground leading-relaxed">{resolveContent(step.content)}</span>
						{#if step.timer_seconds}
							<button class="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
								text-xs transition-colors cursor-pointer
								{timerRunning[idx] ? 'bg-primary/15 text-primary' : 'bg-muted border border-muted-foreground/15 text-muted-foreground hover:bg-accent/60'}"
								onclick={(e) => { e.stopPropagation(); toggleTimer(idx, step.timer_seconds!); }}>
								{#if timerRunning[idx]}
									<Pause class="w-2.5 h-2.5" style="margin-bottom: 1px" />
								{:else}
									<Play class="w-2.5 h-2.5" style="margin-bottom: 1px" />
								{/if}
								<span class="tabular-nums" dir="ltr" style="margin-top: 2px">{formatTimer(timerRemaining[idx])}</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Notes -->
	{#if data.notes}
		<div class="mx-5 mt-1 mb-3 p-3.5 rounded-xl bg-background/50">
			<h4 class="thaana text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">ނޯޓްސް</h4>
			<p class="thaana text-sm text-muted-foreground leading-relaxed">{data.notes}</p>
		</div>
	{/if}

	<!-- Action bar -->
	<div class="flex items-center justify-end gap-1.5 px-4 py-3 border-t border-muted-foreground/15">
		<div class="flex items-center h-8 rounded-lg border border-muted-foreground/20 overflow-hidden">
			<button onclick={copyRecipe}
				class="h-8 w-8 flex items-center justify-center hover:bg-accent/60 transition-colors cursor-pointer">
				{#if copied}
					<Check class="w-4 h-4 text-green-400" />
				{:else}
					<Copy class="w-4 h-4 text-muted-foreground" />
				{/if}
			</button>
		</div>

		<div class="flex items-center h-8 rounded-lg border border-muted-foreground/20 overflow-hidden">
			<button onclick={printRecipe}
				class="h-8 w-8 flex items-center justify-center hover:bg-accent/60 transition-colors cursor-pointer">
				<Printer class="w-4 h-4 text-muted-foreground" />
			</button>
		</div>

		<button onclick={() => { cookingMode = true; }}
			class="h-8 px-3 flex items-center gap-2 rounded-lg border border-muted-foreground/20 hover:bg-accent/60
				text-xs font-medium text-foreground transition-colors">
			<CookingPot class="w-3.5 h-3.5" />
			<span class="thaana">ކެއްކަން ފަށާ</span>
		</button>
	</div>
</div>

{#if cookingMode}
	<RecipeCookingMode
		{data}
		{servings}
		{scaleFactor}
		onClose={() => { cookingMode = false; }}
	/>
{/if}
