<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { ChevronDown, ChevronLeft } from 'lucide-svelte';

	let {
		icon,
		label,
		shimmer = false,
		children
	}: {
		icon: Component;
		label: string;
		shimmer?: boolean;
		children?: Snippet;
	} = $props();

	let expanded = $state(false);
	let expandable = $derived(!!children && !shimmer);
</script>

<div class="mb-0.5">
	<button
		onclick={() => { if (expandable) expanded = !expanded; }}
		class="group/step inline-flex items-center gap-1.5 h-7 text-xs transition-colors"
	>
		<svelte:component this={icon} class="w-3 h-3 text-muted-foreground/60 shrink-0" />

		<span
			class="thaana text-xs text-muted-foreground/70
				{shimmer ? 'step-shimmer' : ''}"
		>
			{label}
		</span>

		{#if expandable}
			<span class="{expanded ? 'opacity-100' : 'opacity-0 group-hover/step:opacity-100'} transition-opacity duration-150">
				{#if expanded}
					<ChevronDown class="w-3 h-3 text-muted-foreground/40" />
				{:else}
					<ChevronLeft class="w-3 h-3 text-muted-foreground/40" />
				{/if}
			</span>
		{/if}
	</button>

	{#if children && expanded}
		<div class="mr-6 pb-1.5">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	@keyframes step-shimmer {
		0% {
			background-position: 200% center;
		}
		100% {
			background-position: -200% center;
		}
	}

	.step-shimmer {
		background: linear-gradient(
			90deg,
			var(--muted-foreground) 0%,
			var(--muted-foreground) 35%,
			var(--primary) 50%,
			var(--muted-foreground) 65%,
			var(--muted-foreground) 100%
		);
		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: step-shimmer 2s ease-in-out infinite;
	}
</style>
