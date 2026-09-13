<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Popover } from 'bits-ui';
	import { ArrowRight, Check, ChevronDown, RotateCcw, Sparkles } from 'lucide-svelte';
	import { effortLabel, groupModels, modelLabel, preferredOption, type ModelGroup } from '$lib/model-options';

	let { models, selectedModel = $bindable('gemini-3-flash-preview') }: {
		models: string[];
		selectedModel?: string;
	} = $props();

	const memoryKey = 'raalhu_model_efforts';
	let remembered: Record<string, string> = {};
	let hydrated = $state(false);
	let open = $state(false);
	let view = $state<'models' | 'effort'>('models');
	let slider = $state<HTMLInputElement>();
	let groups = $derived(groupModels(models));
	let selectedGroup = $derived(groups.find((group) => group.options.some((option) => option.id === selectedModel)));
	let selectedOption = $derived(selectedGroup?.options.find((option) => option.id === selectedModel));
	let showEffort = $derived(view === 'effort' && selectedGroup && selectedOption?.effort);
	let label = $derived(selectedGroup
		? `${selectedGroup.label}${selectedOption?.effort ? ` · ${effortLabel[selectedOption.effort]}` : ''}`
		: modelLabel(selectedModel));

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(memoryKey) || '{}');
			if (saved && typeof saved === 'object' && !Array.isArray(saved)) remembered = saved;
		} catch { /* Invalid preferences must not block model selection. */ }
		hydrated = true;
	});

	$effect(() => {
		if (!hydrated || !selectedGroup || !selectedOption?.effort) return;
		remembered[selectedGroup.key] = selectedModel;
		try { localStorage.setItem(memoryKey, JSON.stringify(remembered)); } catch {}
	});

	async function selectGroup(group: ModelGroup) {
		const option = preferredOption(group, selectedGroup?.key === group.key ? selectedModel : remembered[group.key]);
		selectedModel = option.id;
		if (option.effort) {
			view = 'effort';
			await tick();
			slider?.focus();
		} else open = false;
	}
</script>

<Popover.Root bind:open onOpenChange={(value) => { if (value) view = 'models'; }}>
	<Popover.Trigger dir="rtl" lang="dv" title={label}
		class="thaana inline-flex items-center h-8 gap-1.5 px-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-0">
		<Sparkles class="w-4.5 h-4.5 shrink-0" />
		<span class="text-xs font-medium truncate">{label}</span>
		<ChevronDown class="w-3.5 h-3.5 shrink-0" />
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content side="top" align="start" sideOffset={12} collisionPadding={12}
			dir="rtl" lang="dv" aria-label={showEffort ? 'ވިސްނުމުގެ މިންވަރު' : 'މޮޑެލް ހޮވާ'}
			class="thaana z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-3xl border border-border bg-popover p-4 shadow-lg outline-none">
			{#if showEffort && selectedGroup && selectedOption?.effort}
				<div class="flex items-start justify-between gap-2">
					<button type="button" onclick={() => view = 'models'} aria-label="މޮޑެލް ބަދަލުކުރޭ"
						class="p-2 rounded-lg text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary">
						<ArrowRight class="w-4 h-4" />
					</button>
					<div class="min-w-0 text-center">
						<p class="text-xl font-medium text-primary" aria-live="polite">{effortLabel[selectedOption.effort]}</p>
						<button type="button" onclick={() => view = 'models'} class="mt-1 text-sm text-muted-foreground hover:text-foreground">
							{selectedGroup.label}
						</button>
					</div>
					<button type="button" aria-label="ވިސްނުމުގެ މިންވަރު ޑިފޯލްޓަށް އަނބުރާލާ" title="ވިސްނުމުގެ މިންވަރު ޑިފޯލްޓަށް އަނބުރާލާ"
						onclick={() => { if (selectedGroup) selectedModel = preferredOption(selectedGroup).id; }}
						class="p-2 rounded-lg text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary">
						<RotateCcw class="w-4 h-4" />
					</button>
				</div>
				{#if selectedGroup.options.length > 1}
					<div class="mt-6">
						<input bind:this={slider} type="range" min="0" max={selectedGroup.options.length - 1} step="1"
							value={selectedGroup.options.findIndex((option) => option.id === selectedModel)}
							oninput={(event) => { if (selectedGroup) selectedModel = selectedGroup.options[Number(event.currentTarget.value)].id; }}
							aria-label={`${selectedGroup.label} ވިސްނުމުގެ މިންވަރު`}
							aria-valuetext={effortLabel[selectedOption.effort]} class="model-effort-slider w-full" />
						<div class="flex justify-between gap-1 mt-3">
							{#each selectedGroup.options as option (option.id)}
								<button type="button" onclick={() => selectedModel = option.id} aria-pressed={selectedModel === option.id}
									class="rounded-md px-1 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary {selectedModel === option.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}">
									{option.effort ? effortLabel[option.effort] : ''}
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<p class="mt-5 text-center text-xs text-muted-foreground">މިހާރު ލިބެން ހުރީ މި މިންވަރު އެކަނި.</p>
				{/if}
			{:else}
				<p class="text-sm text-muted-foreground px-2 mb-3">މޮޑެލް ހޮވާ</p>
				<div class="max-h-[min(22rem,50dvh)] overflow-y-auto space-y-1">
					{#each groups as group (group.key)}
						<button type="button" aria-pressed={selectedGroup?.key === group.key} onclick={() => selectGroup(group)}
							class="w-full text-start flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary text-sm text-foreground">
							<span>{group.label}</span>
							{#if selectedGroup?.key === group.key}<Check class="w-4 h-4 text-primary shrink-0" />{/if}
						</button>
					{/each}
				</div>
			{/if}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

<style>
	.model-effort-slider {
		appearance: none;
		height: 32px;
		border-radius: 9999px;
		background: var(--accent);
		border: 1px solid var(--border);
		cursor: pointer;
	}
	.model-effort-slider::-webkit-slider-thumb {
		appearance: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--foreground);
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
	}
	.model-effort-slider::-moz-range-thumb {
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 50%;
		background: var(--foreground);
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
	}
	.model-effort-slider:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 4px;
	}
</style>
