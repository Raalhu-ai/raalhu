<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		ArrowRight,
		Sun,
		Moon,
		Monitor,
		Trash2,
		LogOut,
		Link2,
		KeyRound,
		ChevronDown,
		UserRound,
		Shield,
		Bot,
		Download,
		Upload,
		FileJson
	} from 'lucide-svelte';
	import type { User } from '$lib/api';
	import type { Project } from '$lib/db';
	import { loadSettings, saveSettings, applyTheme, applyFontSize, type Settings } from '$lib/settings';
		import {
			setGeminiApiKey,
			clearGeminiApiKey,
			setGeminiApiKeyStatus,
			setModelProvider
		} from '$lib/gemini-api';
	import { exportChatHistory, importChatHistory } from '$lib/chat-history';
	import { db } from '$lib/db';
	import { listProjects, updateProjectMemory } from '$lib/project-store';
	import * as Dialog from '$lib/components/ui/dialog';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';

	type SettingsSection = 'general' | 'memories' | 'byok' | 'importExport';
	type ImportStatusType = 'idle' | 'success' | 'error';

	type ProviderPlaceholder = {
		name: string;
		label: string;
		placeholder: string;
		enabled: boolean;
	};

	let {
		user,
		onLogout,
		onBack,
		onSessionsCleared = () => {},
		onSessionsImported = () => {}
	}: {
		user: User | null;
		onLogout: () => void;
		onBack: () => void;
		onSessionsCleared?: () => void;
		onSessionsImported?: () => void;
	} = $props();

		const initialSettings = loadSettings();
		let settings = $state<Settings>(initialSettings);
	let clearDialogOpen = $state(false);
	let clearing = $state(false);
		let activeSection = $state<SettingsSection>('general');
		let geminiApiKeyInput = $state(initialSettings.geminiApiKey);
		let geminiApiKeySaved = $state(false);
		let byokTesting = $state(false);
		let byokTestError = $state('');
		let exportingChats = $state(false);
	let importingChats = $state(false);
	let importStatusType = $state<ImportStatusType>('idle');
	let importStatus = $state('');
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let memoryProjects = $state<Project[]>([]);
	let expandedMemoryProjects = $state<Record<string, boolean>>({});
	let projectMemoryDrafts = $state<Record<string, string>>({});
	const projectMemoryTimers = new Map<string, ReturnType<typeof setTimeout>>();

	function update(partial: Partial<Settings>) {
		settings = { ...settings, ...partial };
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			saveSettings(settings);
		}, 100);
	}

	function setTheme(theme: Settings['theme']) {
		update({ theme });
		saveSettings({ ...settings, theme });
		applyTheme(theme);
	}

	function setFontSize(fontSize: Settings['fontSize']) {
		update({ fontSize });
		saveSettings({ ...settings, fontSize });
		applyFontSize(fontSize);
	}

	function handleInstructionsInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		update({ customInstructions: target.value });
	}

	function handleMemoriesInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		update({ memories: target.value });
	}

	async function loadMemoryProjects() {
		memoryProjects = await listProjects();
		projectMemoryDrafts = Object.fromEntries(
			memoryProjects.map((project) => [project.id, project.memory || ''])
		);
	}

	function toggleMemoryProject(projectId: string) {
		expandedMemoryProjects = {
			...expandedMemoryProjects,
			[projectId]: !expandedMemoryProjects[projectId]
		};
	}

	function handleProjectMemoryInput(projectId: string, e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const value = target.value;
		projectMemoryDrafts = { ...projectMemoryDrafts, [projectId]: value };

		const existingTimer = projectMemoryTimers.get(projectId);
		if (existingTimer) clearTimeout(existingTimer);

		const timer = setTimeout(async () => {
			await updateProjectMemory(projectId, value);
			projectMemoryTimers.delete(projectId);
			memoryProjects = memoryProjects.map((project) =>
				project.id === projectId ? { ...project, memory: value, updatedAt: Date.now() } : project
			);
		}, 800);

		projectMemoryTimers.set(projectId, timer);
	}

		function handleGeminiApiKeyInput(e: Event) {
			const target = e.target as HTMLInputElement;
			geminiApiKeyInput = target.value;
			geminiApiKeySaved = false;
			byokTestError = '';
		}

		function saveGeminiKey() {
			setGeminiApiKey(geminiApiKeyInput);
			settings = {
				...settings,
				geminiApiKey: geminiApiKeyInput.trim(),
				modelProvider: 'code-assist',
				geminiApiKeyStatus: 'untested'
			};
			geminiApiKeyInput = geminiApiKeyInput.trim();
			geminiApiKeySaved = true;
			byokTestError = '';
		}

		function clearGeminiKey() {
			clearGeminiApiKey();
			settings = {
				...settings,
				geminiApiKey: '',
				modelProvider: 'code-assist',
				geminiApiKeyStatus: 'untested'
			};
			geminiApiKeyInput = '';
			geminiApiKeySaved = false;
			byokTestError = '';
		}

		async function testGeminiKey() {
			const key = geminiApiKeyInput.trim();
			if (!key) {
				byokTestError = 'ޖެމިނީ API ކީ ޖައްސަވާ.';
				return;
			}

			if (key !== settings.geminiApiKey) {
				saveGeminiKey();
			}

			byokTesting = true;
			byokTestError = '';
			try {
				const res = await fetch('/api/byok-test', {
					method: 'POST',
					headers: { 'X-Gemini-API-Key': key }
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || 'Gemini key test failed');
				}
				setGeminiApiKeyStatus('valid');
				settings = { ...settings, geminiApiKey: key, geminiApiKeyStatus: 'valid' };
			} catch (err: any) {
				setGeminiApiKeyStatus('invalid');
				settings = {
					...settings,
					geminiApiKey: key,
					modelProvider: 'code-assist',
					geminiApiKeyStatus: 'invalid'
				};
				byokTestError = err.message || 'Gemini key test failed';
			} finally {
				byokTesting = false;
			}
		}

		function useGeminiApi() {
			if (!settings.geminiApiKey || settings.geminiApiKeyStatus !== 'valid') return;
			setModelProvider('gemini-api');
			settings = { ...settings, modelProvider: 'gemini-api' };
		}

		function useCodeAssistProxy() {
			setModelProvider('code-assist');
			settings = { ...settings, modelProvider: 'code-assist' };
		}

	async function clearAllChats() {
		clearing = true;
		try {
			await db.sessions.toCollection().modify({ archived: 1 as const });
			clearDialogOpen = false;
			onSessionsCleared();
		} catch (err) {
			console.error('Failed to clear chats:', err);
		} finally {
			clearing = false;
		}
	}

	async function exportChats() {
		exportingChats = true;
		importStatusType = 'idle';
		importStatus = '';
		try {
			const history = await exportChatHistory();
			const data = JSON.stringify(history, null, 2);
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const date = new Date().toISOString().slice(0, 10);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `raalhu-chat-history-${date}.json`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Failed to export chats:', err);
			importStatusType = 'error';
			importStatus = 'ޗެޓް ހިސްޓްރީ އެކްސްޕޯޓް ނުކުރެވުނު.';
		} finally {
			exportingChats = false;
		}
	}

	async function importChats(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importingChats = true;
		importStatusType = 'idle';
		importStatus = '';

		try {
			const raw = await file.text();
			const payload = JSON.parse(raw);
			const result = await importChatHistory(payload);
			onSessionsImported();
			importStatusType = 'success';
			importStatus = `${result.imported} އާ ޗެޓް، ${result.updated} އަޕްޑޭޓް، ${result.skipped} ސްކިޕް ކުރެވިއްޖެ.`;
		} catch (err) {
			console.error('Failed to import chats:', err);
			importStatusType = 'error';
			importStatus =
				'މި JSON ފައިލް އިމްޕޯޓް ނުކުރެވޭ. ރާޅު ޗެޓް ހިސްޓްރީ އެކްސްޕޯޓް ފައިލެއް ޚިޔާރު ކުރޭ.';
		} finally {
			importingChats = false;
			input.value = '';
		}
	}

	function getInitials(name?: string | null) {
		return (name?.trim()?.[0] ?? 'R').toUpperCase();
	}

	onMount(() => {
		loadMemoryProjects();
	});

	onDestroy(() => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveSettings(settings);
		}
		for (const [projectId, timer] of projectMemoryTimers.entries()) {
			clearTimeout(timer);
			void updateProjectMemory(projectId, projectMemoryDrafts[projectId] || '');
		}
		projectMemoryTimers.clear();
	});

	const sections: { value: SettingsSection; label: string; icon: typeof UserRound }[] = [
		{ value: 'general', label: 'ޖެނެރަލް', icon: UserRound },
		{ value: 'memories', label: 'ހަނދާންތައް', icon: Bot },
		{ value: 'byok', label: 'BYOK', icon: KeyRound },
		{ value: 'importExport', label: 'އިމްޕޯޓް / އެކްސްޕޯޓް', icon: FileJson }
	];

	const themeOptions: { value: Settings['theme']; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'އަލި', icon: Sun },
		{ value: 'dark', label: 'އަނދިރި', icon: Moon },
		{ value: 'system', label: 'ސިސްޓަމް', icon: Monitor }
	];

	const fontSizeOptions: { value: Settings['fontSize']; label: string }[] = [
		{ value: 'small', label: 'ކުޑަ' },
		{ value: 'medium', label: 'މެދު' },
		{ value: 'large', label: 'ބޮޑު' }
	];

	const byokProviders: ProviderPlaceholder[] = [
		{
			name: 'Anthropic',
			label: 'Anthropic API key',
			placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxx',
			enabled: false
		},
		{
			name: 'OpenAI',
			label: 'OpenAI API key',
			placeholder: 'sk-proj-xxxxxxxxxxxxxxxx',
			enabled: false
		},
		{
			name: 'Google AI Studio',
			label: 'Gemini API key',
			placeholder: 'AIzaSyxxxxxxxxxxxxxxxx',
			enabled: true
		}
	];
</script>

<div class="flex-1 overflow-y-auto" dir="rtl">
	<div class="mx-auto flex w-full max-w-[1544px] flex-col gap-8 px-4 py-8 pb-20 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)_240px] lg:[direction:ltr]">
			<div class="lg:col-start-2" dir="rtl">
				<div>
					<h1 class="thaana-heading text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">ސެޓިންގްސް</h1>
					<p class="thaana mt-1 text-sm text-muted-foreground">އެކައުންޓް، މަޤްސަދުތައް، އަދި މޮޑެލް ސެޓިންގްތައް.</p>
				</div>
			</div>
		</div>

		<div class="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)_240px] lg:[direction:ltr]">
			<nav class="lg:sticky lg:top-6 lg:col-start-3 lg:row-start-1 lg:self-start" dir="rtl">
				<button
					onclick={onBack}
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
					aria-label="ފަހަތަށް"
				>
					<ArrowRight class="h-5 w-5" />
				</button>

				<div class="hidden lg:flex lg:flex-col lg:gap-2">
					{#each sections as section}
						{@const SectionIcon = section.icon}
						<button
							onclick={() => (activeSection = section.value)}
							class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base transition-colors duration-150
								{activeSection === section.value
									? 'bg-black/50 text-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
							aria-pressed={activeSection === section.value}
						>
							<SectionIcon class="h-4 w-4 shrink-0" />
							<span class="thaana">{section.label}</span>
						</button>
					{/each}
				</div>

				<div class="flex gap-2 overflow-x-auto pb-1 lg:hidden">
					{#each sections as section}
						{@const SectionIcon = section.icon}
						<button
							onclick={() => (activeSection = section.value)}
							class="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-150
								{activeSection === section.value
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-card text-muted-foreground hover:text-foreground'}"
							aria-pressed={activeSection === section.value}
						>
							<SectionIcon class="h-4 w-4" />
							<span class="thaana">{section.label}</span>
						</button>
					{/each}
				</div>
			</nav>

			<div class="min-w-0 lg:col-start-2 lg:row-start-1" dir="rtl">
				{#if activeSection === 'general'}
					<div class="space-y-10">
						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">ޕްރޮފައިލް</h2>
							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">އެވެޓާ</div>
									</div>
									<div class="flex items-center justify-between gap-4 px-4 md:px-0">
										<div>
											<div class="thaana text-sm text-muted-foreground">މައި އެކައުންޓުގެ އެވެޓާ</div>
										</div>
										{#if user?.picture}
											<img
												src={user.picture}
												alt=""
												class="h-14 w-14 rounded-full border border-border/70 object-cover"
											/>
										{:else}
											<div class="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-foreground">
												{getInitials(user?.name)}
											</div>
										{/if}
									</div>
								</div>

								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">ފުރިހަމަ ނަން</div>
									</div>
									<div class="px-4 md:px-0">
										<div class="rounded-2xl border border-border/70 bg-accent/60 px-4 py-3 text-base text-foreground">
											{user?.name ?? 'ލިބެން ނެތް'}
										</div>
									</div>
								</div>

								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">އީމެއިލް</div>
									</div>
									<div class="px-4 md:px-0">
										<div class="rounded-2xl border border-border/70 bg-accent/60 px-4 py-3 text-base text-foreground">
											{user?.email ?? 'ލިބެން ނެތް'}
										</div>
									</div>
								</div>
							</div>
						</section>

						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">މަޤްސަދުތައް</h2>
							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">ފެންނަ ގޮތް</div>
									</div>
									<div class="px-4 md:px-0">
										<div class="inline-flex rounded-2xl border border-border/70 bg-accent/50 p-1">
											{#each themeOptions as opt}
												{@const ThemeIcon = opt.icon}
												<button
													onclick={() => setTheme(opt.value)}
													class="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors duration-150
														{settings.theme === opt.value
															? 'bg-background text-foreground shadow-sm'
															: 'text-muted-foreground hover:text-foreground'}"
													aria-pressed={settings.theme === opt.value}
												>
													<ThemeIcon class="h-4 w-4" />
													<span class="thaana">{opt.label}</span>
												</button>
											{/each}
										</div>
									</div>
								</div>

								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">ޗެޓް ފޮންޓް ސައިޒް</div>
									</div>
									<div class="space-y-4 px-4 md:px-0">
										<div class="inline-flex rounded-2xl border border-border/70 bg-accent/50 p-1">
											{#each fontSizeOptions as opt}
												<button
													onclick={() => setFontSize(opt.value)}
													class="rounded-xl px-4 py-2 text-sm transition-colors duration-150
														{settings.fontSize === opt.value
															? 'bg-background text-foreground shadow-sm'
															: 'text-muted-foreground hover:text-foreground'}"
														aria-pressed={settings.fontSize === opt.value}
													>
													<span class="thaana">{opt.label}</span>
												</button>
											{/each}
										</div>
										<p
											class="thaana max-w-xl text-muted-foreground"
											style="font-size: var(--chat-font-size); line-height: 1.9;"
										>
											މި ޕްރީވިއު އިން ދައްކާނީ ޗެޓް ސަފްހާގައި ބޭނުންކުރާ އެއް ފޮންޓް ސައިޒް އެވެ.
										</p>
									</div>
								</div>

								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">ކަނެކްޓެޑް އެޕްސް</div>
									</div>
									<div class="px-4 md:px-0">
										<div class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-accent/40 px-4 py-3">
											<div class="flex min-w-0 items-center gap-3">
												<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 text-muted-foreground">
													<Link2 class="h-4 w-4" />
												</div>
												<div class="min-w-0">
													<div class="thaana text-sm font-medium text-foreground">ކަނެކްޓަރސް</div>
													<div class="thaana text-sm text-muted-foreground" dir="rtl">އެޕްތަކާ ގުޅުމަށް މި ޚިޔާރު ނަގާލާ.</div>
												</div>
											</div>
											<div class="thaana rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
												އަންނަނީ...
											</div>
										</div>
									</div>
								</div>
							</div>
						</section>

						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">އެސިސްޓަންޓް</h2>
							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">އިރުޝާދު</div>
									</div>
									<div class="space-y-3 px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											މި އިރުޝާދުތައް ލޯކަލްކޮށް ސޭވް ކުރެވޭނެ، އަދި ޓޯން، ތަފްސީލު، އަދި ގައިޑުތައް ކޮންޓްރޯލް ކުރުމަށް ހުރިހާ ޗެޓަކަށް އެޕްލައި ކުރެވޭނެ.
										</p>
										<Textarea
											value={settings.customInstructions}
											oninput={handleInstructionsInput}
											placeholder="މިސާލު: ޖަވާބު ކުރުކޮށް، އިމްޕްލިމެންޓޭޝަން ތަފްސީލުތަކަށް ފޯކަސް ކުރޭ."
											class="thaana min-h-36 rounded-2xl border-border/70 bg-accent/30 text-base"
											dir="rtl"
										/>
									</div>
								</div>
							</div>
						</section>

						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">ޑޭޓާ އަދި އެކައުންޓް</h2>
							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">ޗެޓް ހިސްޓްރީ</div>
									</div>
									<div class="space-y-3 px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											މިހާރު އެކްޓިވް ވޯރކްސްޕޭސްގައި ހުރި ހުރިހާ ޗެޓްތައް އާކައިވް ކުރޭ. މިއަށް އަނބުރާ ފްލޯއެއް ނެތެވެ.
										</p>
										<button
											onclick={() => (clearDialogOpen = true)}
											class="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
										>
											<Trash2 class="h-4 w-4" />
											<span class="thaana">ޗެޓް ފޮހެލާ</span>
										</button>
									</div>
								</div>

								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">އެކައުންޓް</div>
									</div>
									<div class="space-y-3 px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											މި ޑިވައިސްގައި މިހާރު ހުރި އެކައުންޓުން ލޮގް އައުޓް ކުރޭ.
										</p>
										<button
											onclick={onLogout}
											class="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm text-foreground transition-colors duration-150 hover:bg-accent"
										>
											<LogOut class="h-4 w-4" />
											<span class="thaana">ލޮގް އައުޓް</span>
										</button>
									</div>
								</div>
							</div>
						</section>
					</div>
				{:else if activeSection === 'memories'}
					<div class="space-y-10">
						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">ހަނދާންތައް</h2>
							<p class="thaana mt-2 max-w-3xl text-sm text-muted-foreground">
								ހަނދާންތަކަކީ ޗެޓް މެސެޖާ އެކު އެޖެންޓަށް ފޮނުވޭ މައުލޫމާތެވެ. އޭއަށް AI ކުރި ކުށްތައް އަލުން ނުކުރުމަށް އިރުޝާދު، ތިބާ ރުހޭ ގޮތްތައް، ނުވަތަ "އަޅުގަނޑަކީ މަގުފަރުކުރާ މީހެއް" ފަދަ ތިބާގެ ސިޔާޤު ހިމެނިދާނެ.
							</p>

							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">އާންމު ހަނދާންތައް</div>
									</div>
									<div class="space-y-3 px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											މިތަނުގައި ލިޔޭ ހަނދާންތައް ހުރިހާ އާދައިގެ ޗެޓަކާ އެކު ފޮނުވޭނެ. ހުސްކޮށް ބަހައްޓައިފިނަމަ އެއްޗެއް ނުފޮނުވޭ.
										</p>
										<Textarea
											value={settings.memories}
											oninput={handleMemoriesInput}
											placeholder="މިސާލު: އަޅުގަނޑަކީ މަގުފަރުކުރާ މީހެއް. ޖަވާބުތަކުގައި ކުރު ޚުލާސާއެއް ފުރަތަމަ ދޭ."
											class="thaana min-h-40 rounded-2xl border-border/70 bg-accent/30 text-base"
											dir="rtl"
										/>
									</div>
								</div>
							</div>
						</section>

						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">ޕްރޮޖެކްޓް ހަނދާންތައް</h2>
							<p class="thaana mt-2 max-w-3xl text-sm text-muted-foreground">
								ތިރީގައި ހުރީ މި ޑިވައިސްގައި ހުރި ޕްރޮޖެކްޓްތަކެވެ. ކޮންމެ ޕްރޮޖެކްޓެއް ހުޅުވައި، އެ ޕްރޮޖެކްޓަށް ޚާއްޞަ ހަނދާން ބަލައި ބަދަލު ކުރޭ. މި ހަނދާންތައް ފޮނުވޭނީ އެ ޕްރޮޖެކްޓް ޗެޓްތަކާ އެކަންޏެވެ.
							</p>

							<div class="mt-6 overflow-hidden rounded-[24px] border border-border/70 bg-card/40">
								{#if memoryProjects.length === 0}
									<div class="px-6 py-8">
										<p class="thaana text-sm text-muted-foreground">
											އަދި ޕްރޮޖެކްޓެއް ނެތް. ޕްރޮޖެކްޓެއް ހެދުމަށް ފަހު މިތާ އޭގެ ހަނދާން ފެންނާނެ.
										</p>
									</div>
								{:else}
									{#each memoryProjects as project, index}
										<div class={index < memoryProjects.length - 1 ? 'border-b border-border/70' : ''}>
											<button
												onclick={() => toggleMemoryProject(project.id)}
												class="flex w-full items-center justify-between gap-4 px-4 py-4 text-right transition-colors duration-150 hover:bg-accent/40 md:px-6"
												aria-expanded={expandedMemoryProjects[project.id] || false}
											>
												<div class="min-w-0">
													<div class="thaana truncate text-sm font-medium text-foreground">{project.name}</div>
													<div class="thaana mt-1 text-xs text-muted-foreground">
														{#if (projectMemoryDrafts[project.id] || '').trim()}
															ހަނދާން ލިޔެފައި
														{:else}
															ހަނދާން ހުސް
														{/if}
													</div>
												</div>
												<ChevronDown
													class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 {expandedMemoryProjects[project.id] ? 'rotate-180' : ''}"
												/>
											</button>

											{#if expandedMemoryProjects[project.id]}
												<div class="space-y-3 px-4 pb-5 md:px-6">
													<p class="thaana text-sm text-muted-foreground">
														މި ޕްރޮޖެކްޓްގެ ޗެޓްތަކާ އެކު ފޮނުވޭ ހަނދާން.
													</p>
													<Textarea
														value={projectMemoryDrafts[project.id] || ''}
														oninput={(event) => handleProjectMemoryInput(project.id, event)}
														placeholder="މިސާލު: މި ޕްރޮޖެކްޓްގައި ޖަވާބު ހުށަހަޅާއިރު ކުރީގެ ފައިލްތަކުގެ ނަންތައް ހަނދާންކުރޭ."
														class="thaana min-h-32 rounded-2xl border-border/70 bg-accent/30 text-base"
														dir="rtl"
													/>
												</div>
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						</section>
					</div>
				{:else if activeSection === 'byok'}
					<div class="space-y-10">
						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">އަމިއްލަ ކީތައް</h2>
							<p class="thaana mt-2 max-w-3xl text-sm text-muted-foreground">
								ޖެމިނީ API ކީ ސޭވް ކުރެވޭނީ މި ބްރައުޒަރގައި އެކަނިއެވެ. ކީ އެއް ސޭވް ކުރެވިފައި އޮތްނަމަ، ވޮއިސް ނޫން މޮޑެލް ރިކުއެސްޓްތައް SDK މަގުން ހިނގާނެ.
							</p>

							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								{#each byokProviders as provider, index}
									<div
										class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6 {index < byokProviders.length - 1 ? 'border-b border-border/70' : ''}"
									>
										<div class="px-4 md:px-0">
											<div class="flex items-center gap-2 text-sm font-medium text-foreground">
												<Bot class="h-4 w-4" />
												<span>{provider.name}</span>
											</div>
										</div>
										<div class="space-y-4 px-4 md:px-0 {provider.enabled ? '' : 'opacity-60'}">
												<div class="flex flex-wrap items-center gap-3">
													{#if provider.enabled}
														<div class="thaana rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
															އެނޭބަލް ކުރެވިފައި
														</div>
														<div class="thaana rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
															{#if settings.modelProvider === 'gemini-api'}
																މިހާރު BYOK
															{:else}
																މިހާރު ޕްރޮކްސީ
															{/if}
														</div>
														<div
															class="thaana rounded-full border px-3 py-1 text-xs
																{settings.geminiApiKeyStatus === 'valid'
																	? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
																	: settings.geminiApiKeyStatus === 'invalid'
																		? 'border-destructive/30 bg-destructive/10 text-destructive'
																		: 'border-border/70 text-muted-foreground'}"
														>
															{#if settings.geminiApiKeyStatus === 'valid'}
																ޓެސްޓް ފާސް
															{:else if settings.geminiApiKeyStatus === 'invalid'}
																ޓެސްޓް ފޭލް
															{:else}
																ޓެސްޓް ނުކުރެވި
															{/if}
														</div>
													{:else}
													<div class="thaana rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
														ޑިސޭބަލް ކުރެވިފައި
													</div>
													<div class="thaana rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
														އަންނަނީ...
													</div>
												{/if}
											</div>
											<div class="space-y-2">
												<div class="thaana text-sm text-muted-foreground">{provider.label}</div>
												{#if provider.enabled}
													<input
														type="password"
														value={geminiApiKeyInput}
														oninput={handleGeminiApiKeyInput}
														placeholder={provider.placeholder}
														dir="ltr"
														autocomplete="off"
														spellcheck="false"
														class="w-full rounded-2xl border border-border/70 bg-accent/40 px-4 py-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary/50"
													/>
														<p class="thaana text-xs text-muted-foreground">
															{#if settings.geminiApiKey}
																ކީ މި ބްރައުޒަރގައި ސޭވް ކުރެވިފައި. BYOK ބޭނުންކުރެވޭނީ ޓެސްޓް ފާސް ވުމަށްފަހު.
															{:else}
																ކީ އެއް އަދި ސޭވް ނުކުރެވި.
															{/if}
														</p>
														{#if byokTestError}
															<p class="text-xs text-destructive break-words" dir="ltr">{byokTestError}</p>
														{/if}
													{:else}
													<div class="rounded-2xl border border-border/70 bg-accent/40 px-4 py-3 text-sm text-muted-foreground">
														{provider.placeholder}
													</div>
												{/if}
											</div>
												<div class="flex flex-wrap gap-3">
													<button
														disabled={!provider.enabled}
													onclick={saveGeminiKey}
													class="rounded-xl border border-border/70 px-4 py-2.5 text-sm transition-colors duration-150
														{provider.enabled
															? 'text-foreground hover:bg-accent'
															: 'text-muted-foreground opacity-60'}"
													>
														<span class="thaana">ކީ ސޭވް ކުރޭ</span>
													</button>
													<button
														disabled={!provider.enabled || byokTesting || !geminiApiKeyInput.trim()}
														onclick={testGeminiKey}
														class="rounded-xl border border-border/70 px-4 py-2.5 text-sm transition-colors duration-150
															{provider.enabled && !byokTesting && geminiApiKeyInput.trim()
																? 'text-foreground hover:bg-accent'
																: 'text-muted-foreground opacity-60'}"
													>
														<span class="thaana">{byokTesting ? 'ޓެސްޓް ކުރަނީ...' : 'ކީ ޓެސްޓް ކުރޭ'}</span>
													</button>
													<button
														disabled={!provider.enabled || settings.geminiApiKeyStatus !== 'valid' || !settings.geminiApiKey}
														onclick={useGeminiApi}
														class="rounded-xl border border-border/70 px-4 py-2.5 text-sm transition-colors duration-150
															{provider.enabled && settings.geminiApiKeyStatus === 'valid' && settings.geminiApiKey
																? 'text-foreground hover:bg-accent'
																: 'text-muted-foreground opacity-60'}"
													>
														<span class="thaana">BYOK ބޭނުންކުރޭ</span>
													</button>
													<button
														disabled={!provider.enabled}
														onclick={useCodeAssistProxy}
														class="rounded-xl border border-border/70 px-4 py-2.5 text-sm transition-colors duration-150
															{provider.enabled
																? 'text-foreground hover:bg-accent'
																: 'text-muted-foreground opacity-60'}"
													>
														<span class="thaana">ޕްރޮކްސީ ބޭނުންކުރޭ</span>
													</button>
													<button
														disabled={!provider.enabled}
														onclick={clearGeminiKey}
													class="rounded-xl border border-border/70 px-4 py-2.5 text-sm transition-colors duration-150
														{provider.enabled
															? 'text-foreground hover:bg-accent'
															: 'text-muted-foreground opacity-60'}"
												>
													<span class="thaana">ކީ ފޮހެލާ</span>
												</button>
												{#if provider.enabled && geminiApiKeySaved}
													<span class="thaana inline-flex items-center rounded-xl px-2 text-xs text-emerald-300">
														ސޭވް ކުރެވިއްޖެ
													</span>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</section>

						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">ރައުޓިންގ އަދި ޕްރައިވެސީ</h2>
							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="flex items-center gap-2 text-sm font-medium text-foreground">
											<Shield class="h-4 w-4" />
											<span class="thaana">ކީ ސްޓޯރޭޖް</span>
										</div>
									</div>
									<div class="px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											މިތާ އެންކްރިޕްޓްކޮށް ލޯކަލް ސްޓޯރޭޖް އަދި ޕްރޮވައިޑަރ ޚާއްޞަ ސްކޯޕްތައް ކިހިނެއް ޝަރަހަ ކުރާނެ ބުނެދޭ ޕްލޭސްހޯލްޑަރ ކޮޕީ އެވެ.
										</p>
									</div>
								</div>

								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="thaana text-sm font-medium text-foreground">ޑިފޯލްޓް ޕްރޮވައިޑަރ</div>
									</div>
									<div class="px-4 md:px-0">
										<button
											disabled
											class="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-accent/40 px-4 py-3 text-sm text-muted-foreground opacity-70"
										>
											<span class="thaana">ޕްރޮވައިޑަރ ޚިޔާރު ކުރޭ</span>
											<ChevronDown class="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						</section>
					</div>
				{:else}
					<div class="space-y-10">
						<section>
							<h2 class="thaana-heading text-2xl font-semibold tracking-normal text-foreground">އިމްޕޯޓް އަދި އެކްސްޕޯޓް</h2>
							<p class="thaana mt-2 max-w-3xl text-sm text-muted-foreground">
								ޗެޓް ހިސްޓްރީ JSON ފައިލަކަށް އެކްސްޕޯޓް ކޮށް، އެހެން ޑިވައިސްއަކުން އިމްޕޯޓް ކުރޭ. ޕްރޮޖެކްޓް، ސެޓިންގްސް، API ކީ، އަދި އެކައުންޓް ޑޭޓާ މިއަށް ނުހިމެނޭ.
							</p>

							<div class="mt-6 rounded-[24px] border border-border/70 bg-card/40">
								<div class="grid gap-3 border-b border-border/70 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="flex items-center gap-2 text-sm font-medium text-foreground">
											<Download class="h-4 w-4" />
											<span class="thaana">އެކްސްޕޯޓް</span>
										</div>
									</div>
									<div class="space-y-3 px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											މި ޑިވައިސްގެ ހުރިހާ ޗެޓްތައް، އާކައިވް ކުރެވިފައި ހުރި ޗެޓްތަކާ އެކު، JSON ފައިލަކަށް ޑައުންލޯޑް ކުރޭ.
										</p>
										<button
											onclick={exportChats}
											disabled={exportingChats}
											class="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm text-foreground transition-colors duration-150 hover:bg-accent disabled:opacity-50"
										>
											<Download class="h-4 w-4" />
											<span class="thaana">
												{#if exportingChats}
													އެކްސްޕޯޓް ކުރަނީ...
												{:else}
													ޗެޓް ހިސްޓްރީ އެކްސްޕޯޓް
												{/if}
											</span>
										</button>
									</div>
								</div>

								<div class="grid gap-3 px-0 py-6 md:grid-cols-[160px_minmax(0,1fr)] md:px-6">
									<div class="px-4 md:px-0">
										<div class="flex items-center gap-2 text-sm font-medium text-foreground">
											<Upload class="h-4 w-4" />
											<span class="thaana">އިމްޕޯޓް</span>
										</div>
									</div>
									<div class="space-y-3 px-4 md:px-0">
										<p class="thaana max-w-2xl text-sm text-muted-foreground">
											ރާޅު ޗެޓް ހިސްޓްރީ JSON ފައިލެއް ޚިޔާރު ކުރޭ. އާ ޗެޓްތައް އިތުރު ވާނެ، އަދި މިހާރު ހުރި ޗެޓްތަކަށް ވުރެ އިމްޕޯޓް ފައިލް އާ ނަމަ އަޕްޑޭޓް ވާނެ.
										</p>
										<label
											class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm text-foreground transition-colors duration-150 hover:bg-accent {importingChats ? 'pointer-events-none opacity-50' : ''}"
										>
											<Upload class="h-4 w-4" />
											<span class="thaana">
												{#if importingChats}
													އިމްޕޯޓް ކުރަނީ...
												{:else}
													JSON ފައިލް ޚިޔާރު ކުރޭ
												{/if}
											</span>
											<input
												type="file"
												accept="application/json,.json"
												onchange={importChats}
												disabled={importingChats}
												class="sr-only"
											/>
										</label>
										{#if importStatus}
											<p
												class="thaana rounded-2xl border px-4 py-3 text-sm
													{importStatusType === 'success'
														? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
														: 'border-destructive/30 bg-destructive/10 text-destructive'}"
											>
												{importStatus}
											</p>
										{/if}
									</div>
								</div>
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<Dialog.Root bind:open={clearDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title class="thaana-heading text-lg" dir="rtl">ޗެޓް ފޮހެލާ</Dialog.Title>
			<Dialog.Description class="thaana text-sm text-muted-foreground" dir="rtl">
				މި ވޯރކްސްޕޭސްގެ ހުރިހާ ޗެޓް ހިސްޓްރީ އާކައިވް ކުރަންތަ؟ މި ޞަފްޙާއިން މި ޢަމަލު އަނބުރާ ނުކުރެވޭނެ.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer dir="rtl">
			<button
				onclick={() => (clearDialogOpen = false)}
				class="thaana rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-accent"
			>
				ކެންސަލް
			</button>
			<button
				onclick={clearAllChats}
				disabled={clearing}
				class="thaana rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground transition-colors duration-150 hover:bg-destructive/90 disabled:opacity-50"
			>
				{#if clearing}
					ފޮހެނީ...
				{:else}
					ޗެޓް ފޮހެލާ
				{/if}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
