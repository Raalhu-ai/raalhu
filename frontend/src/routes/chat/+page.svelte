<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Chat, type Message } from '@ai-sdk/svelte';
	import { marked } from 'marked';
	import { fetchMe, setupCodeAssist, logout } from '$lib/api';
	import { getGeminiApiHeaders, setModelProvider, type ModelProvider } from '$lib/gemini-api';
	import { loadSettings, type Settings } from '$lib/settings';
	import { Loader2, Send, Plus, LogOut, Coffee, KeyRound, Sparkles } from 'lucide-svelte';

	marked.setOptions({ breaks: true, gfm: true });

	const SYSTEM_MESSAGES: Message[] = [
		{
			id: 'sys-1',
			role: 'user',
			content:
				'You are Thaana GPT, a helpful AI assistant that communicates in Dhivehi using Thaana script.\nAlways respond in Dhivehi (Thaana script). If the user writes in English, respond in Dhivehi.\nBe helpful, accurate, and natural in your Dhivehi responses.'
		},
		{
			id: 'sys-2',
			role: 'assistant',
			content:
				'އާދެ، އަޅުގަނޑަކީ ތާނަ ޖީޕީޓީ އެވެ. ދިވެހި ބަހުން އެހީތެރިކަން ފޯރުކޮށްދިނުމަށް ތައްޔާރަށް ހުރީމެވެ. ކޮންކަމަކާ ގުޅޭގޮތުން އެހީތެރިކަން ބޭނުންފުޅުވަނީ؟'
		}
	];

	let appState = $state<'loading' | 'chat'>('loading');
	let overlayText = $state('Loading...');
	let messagesEl = $state<HTMLDivElement | undefined>();
	let formEl = $state<HTMLFormElement | undefined>();
	let modelProvider = $state<ModelProvider>('code-assist');

	const chat = new Chat({
		api: '/api/chat',
		initialMessages: SYSTEM_MESSAGES,
		body: { model: 'gemini-3-flash-preview' }
	});

	const isLoading = $derived(chat.status !== 'ready');

	// Auto-scroll
	$effect(() => {
		chat.messages;
		tick().then(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	});

	onMount(() => {
		function syncProvider(settings = loadSettings()) {
			modelProvider =
				settings.modelProvider === 'gemini-api' &&
				settings.geminiApiKeyStatus === 'valid' &&
				!!settings.geminiApiKey.trim()
					? 'gemini-api'
					: 'code-assist';
		}

		syncProvider();
		const onSettingsChanged = (event: Event) => {
			syncProvider((event as CustomEvent<Settings>).detail);
		};
		window.addEventListener('mogger-settings-changed', onSettingsChanged);
		return () => window.removeEventListener('mogger-settings-changed', onSettingsChanged);
	});

	onMount(async () => {
		const user = await fetchMe();
		if (!user) {
			window.location.href = '/auth/login';
			return;
		}
			if (!user.project) {
				overlayText = 'Setting up your Gemini project...';
				try {
					await setupCodeAssist();
			} catch (err: any) {
				overlayText = 'Setup failed: ' + (err.message || 'Unknown error');
				return;
			}
		}
		appState = 'chat';
	});

	function onFormSubmit(e: SubmitEvent) {
		const globalMemory = loadSettings().memories.trim();
		chat.handleSubmit(e, {
			headers: getGeminiApiHeaders(),
			body: globalMemory ? { memories: { global: globalMemory } } : undefined
		});
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (chat.input.trim() && !isLoading) {
				formEl?.requestSubmit();
			}
		}
	}

	function newChat() {
		chat.messages = SYSTEM_MESSAGES;
	}

	async function handleLogout() {
		await logout();
		window.location.href = '/auth/login';
	}

	function switchToProxy() {
		setModelProvider('code-assist');
		modelProvider = 'code-assist';
	}

	// Only show user-visible messages (skip system prompt pair)
	const visibleMessages = $derived(chat.messages.filter((m) => !m.id.startsWith('sys-')));
</script>

{#if appState === 'loading'}
	<div class="flex flex-col items-center justify-center h-screen gap-3">
		<Coffee class="w-8 h-8 text-primary animate-[subtle-pulse_2s_ease-in-out_infinite]" />
		<p class="text-muted-foreground text-sm">{overlayText}</p>
	</div>
{:else}
	<div class="flex flex-col h-screen">
		<!-- Header -->
		<header class="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
				<div class="flex items-center gap-2">
					<Coffee class="w-5 h-5 text-primary" />
					<h1 class="thaana-heading text-lg font-medium text-primary">ތާނަ ޖީޕީޓީ</h1>
				</div>
				<div class="flex gap-2">
					<div
						class="thaana inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border
							{modelProvider === 'gemini-api'
								? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
								: 'border-border text-muted-foreground'}"
					>
						{#if modelProvider === 'gemini-api'}
							<KeyRound class="w-3 h-3" />
							BYOK
							<button type="button" onclick={switchToProxy} class="ms-1 underline">Proxy</button>
						{:else}
							<Sparkles class="w-3 h-3" />
							ޕްރޮކްސީ
						{/if}
					</div>
					<button
					onclick={newChat}
					class="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground
						border border-border rounded-lg
						hover:text-foreground hover:border-input hover:bg-accent
						transition-all duration-150"
				>
					<Plus class="w-3 h-3" />
					New Chat
				</button>
				<button
					onclick={handleLogout}
					class="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground
						border border-border rounded-lg
						hover:text-foreground hover:border-input hover:bg-accent
						transition-all duration-150"
				>
					<LogOut class="w-3 h-3" />
					Sign out
				</button>
			</div>
		</header>

		<!-- Messages -->
		<div bind:this={messagesEl} class="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
			{#each visibleMessages as message}
				<div
					class="animate-fade-in-up max-w-[720px] px-4 py-3 break-words thaana text-[18.5px]
						{message.role === 'user'
							? 'self-start bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm'
							: 'self-end bg-card border border-border rounded-xl rounded-tl-sm prose-chat'}"
				>
					{#if message.role === 'assistant'}
						{@html marked.parse(message.content)}
					{:else}
						{message.content}
					{/if}
				</div>
			{/each}
			{#if isLoading && (visibleMessages.length === 0 || visibleMessages[visibleMessages.length - 1]?.role === 'user')}
				<div class="self-end bg-card border border-border px-4 py-3 rounded-xl">
					<div class="flex gap-1.5">
						<span class="w-2 h-2 rounded-full bg-primary/60 animate-[subtle-pulse_1.5s_ease-in-out_infinite]"></span>
						<span class="w-2 h-2 rounded-full bg-primary/60 animate-[subtle-pulse_1.5s_ease-in-out_infinite]" style="animation-delay: 200ms"></span>
						<span class="w-2 h-2 rounded-full bg-primary/60 animate-[subtle-pulse_1.5s_ease-in-out_infinite]" style="animation-delay: 400ms"></span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input -->
		<form bind:this={formEl} onsubmit={onFormSubmit} class="p-4 border-t border-border flex gap-2.5 items-end shrink-0 bg-card/80 backdrop-blur-md">
			<textarea
				bind:value={chat.input}
				onkeydown={onKeyDown}
				dir="rtl"
				placeholder="...މެސެޖެއް ލިޔުއްވާ"
				rows="2"
				class="thaana input-field flex-1 px-4 py-3 bg-card border border-border rounded-xl
					text-foreground text-[18px] resize-none
					focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40
					placeholder:text-muted-foreground transition-all duration-150"
			></textarea>
			<button
				type="submit"
				disabled={isLoading || !chat.input.trim()}
				class="inline-flex items-center justify-center w-11 h-11
					bg-primary text-primary-foreground rounded-xl
					hover:bg-primary/90 transition-colors duration-150
					disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<Send class="w-4 h-4" />
			</button>
		</form>
	</div>
{/if}
