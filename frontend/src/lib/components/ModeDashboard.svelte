<script lang="ts">
	import { onMount } from 'svelte';
	import { STARTERS } from '$lib/modes';
	import { getGreeting, getFirstName } from '$lib/greetings';
	import { FileText, RefreshCw, FileDown, Languages, Search, Globe, Bot, FolderOpen } from 'lucide-svelte';
	import ChatInput from './ChatInput.svelte';
	import type { ChatInputSendData } from './ChatInput.svelte';
	import type { Project } from '$lib/db';

	let {
		userName = '',
		onSendMessage,
		selectedModel = $bindable('gemini-3-flash-preview'),
		models = [],
		activeProject = null
	}: {
		userName: string;
		onSendMessage: (text: string) => void;
		selectedModel?: string;
		models?: string[];
		activeProject?: Project | null;
	} = $props();

	const iconMap: Record<string, typeof FileText> = {
		FileText,
		RefreshCw,
		FileDown,
		Languages,
		Search,
		Globe,
		Bot
	};

	let greeting = $state(getGreeting());
	let inputValue = $state('');

	const firstName = $derived(getFirstName(userName));

	onMount(() => {
		greeting = getGreeting();
	});

	function handleSend(data: ChatInputSendData) {
		const text = data.message.trim();
		if (!text) return;
		onSendMessage(text);
	}
</script>

<div class="flex flex-col items-center justify-center min-h-full px-6 py-16">
	<!-- Project badge -->
	{#if activeProject}
		<div class="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/5 border border-primary/15 rounded-lg animate-fade-in">
			<FolderOpen class="w-4 h-4 text-primary/70 shrink-0" />
			<span class="thaana text-sm text-foreground">{activeProject.name}</span>
		</div>
	{/if}

	<!-- Greeting -->
	<div class="animate-greeting-in text-center mb-10 max-w-2xl">
		<h1 class="thaana-heading text-7xl sm:text-8xl font-normal mb-3 leading-none">
			<span class="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
				{greeting.heading}{#if firstName}، {firstName}{/if}
			</span>
		</h1>
		<p class="thaana text-muted-foreground text-base animate-fade-in" style="animation-delay: 200ms">
			{greeting.subtitle}
		</p>
	</div>

	<!-- Centered input -->
	<div class="w-full max-w-2xl mb-6 animate-fade-in-up" style="animation-delay: 150ms">
		<ChatInput
			bind:value={inputValue}
			bind:selectedModel
			{models}
			onSend={handleSend}
			autofocus={true}
		/>
	</div>

	<!-- Starter chips -->
	{#if !inputValue.trim()}
		<div class="flex flex-wrap justify-center gap-2 max-w-2xl animate-fade-in-up" style="animation-delay: 300ms">
			{#each STARTERS.filter(s => s.starterText) as starter}
				{@const Icon = iconMap[starter.icon]}
				<button
					onclick={() => { inputValue = starter.starterText; }}
					class="thaana inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] leading-none
						bg-muted border border-border rounded-full
						hover:border-primary/40 hover:bg-accent
						transition-all duration-150 cursor-pointer
						focus:outline-none focus:ring-2 focus:ring-ring/50"
				>
					{#if Icon}
						<Icon class="w-3.5 h-3.5 text-primary/80 shrink-0" />
					{/if}
					<span class="translate-y-px">{starter.labelDv}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
