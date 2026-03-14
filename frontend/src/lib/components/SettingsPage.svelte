<script lang="ts">
	import { ArrowRight, Sun, Moon, Monitor, Trash2, LogOut, Link2, Type } from 'lucide-svelte';
	import type { User } from '$lib/api';
	import { loadSettings, saveSettings, applyTheme, applyFontSize, type Settings } from '$lib/settings';
	import { db } from '$lib/db';
	import * as Dialog from '$lib/components/ui/dialog';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';

	let {
		user,
		onLogout,
		onBack,
		onSessionsCleared = () => {}
	}: {
		user: User | null;
		onLogout: () => void;
		onBack: () => void;
		onSessionsCleared?: () => void;
	} = $props();

	let settings = $state<Settings>(loadSettings());
	let clearDialogOpen = $state(false);
	let clearing = $state(false);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	function update(partial: Partial<Settings>) {
		settings = { ...settings, ...partial };
		// Debounce save for text inputs, immediate for toggles
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

	const themeOptions: { value: Settings['theme']; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'އަލި', icon: Sun },
		{ value: 'dark', label: 'އަނދިރި', icon: Moon },
		{ value: 'system', label: 'ސިސްޓަމް', icon: Monitor }
	];

	const fontSizeOptions: { value: Settings['fontSize']; label: string; size: string }[] = [
		{ value: 'small', label: 'ކުޑަ', size: 'text-sm' },
		{ value: 'medium', label: 'މެދު', size: 'text-base' },
		{ value: 'large', label: 'ބޮޑު', size: 'text-lg' }
	];
</script>

<div class="flex-1 overflow-y-auto" dir="rtl">
	<div class="max-w-2xl mx-auto px-4 py-8 pb-20">
		<!-- Header -->
		<div class="flex items-center gap-3 mb-8">
			<button
				onclick={onBack}
				class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
				aria-label="ފަހަތަށް"
			>
				<ArrowRight class="w-5 h-5" />
			</button>
			<h1 class="thaana-heading text-3xl text-foreground" style="margin-top: 8px;">ސެޓިންގްސް</h1>
		</div>

		<!-- Appearance -->
		<section class="mb-8">
			<h2 class="thaana-heading text-xl text-foreground mb-4" style="margin-top: 6px;">ފެންނަ ގޮތް</h2>

			<!-- Theme -->
			<div class="mb-5">
				<label class="thaana text-sm text-muted-foreground mb-2 block">ތީމް</label>
				<div class="flex gap-2">
					{#each themeOptions as opt}
						<button
							onclick={() => setTheme(opt.value)}
							class="thaana flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all duration-150
								{settings.theme === opt.value
									? 'bg-primary text-primary-foreground border-primary'
									: 'bg-card border-border text-foreground hover:bg-accent'}"
						>
							<opt.icon class="w-4 h-4" />
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Font Size -->
			<div>
				<label class="thaana text-sm text-muted-foreground mb-2 block">ފޮންޓް ސައިޒް</label>
				<div class="flex gap-2">
					{#each fontSizeOptions as opt}
						<button
							onclick={() => setFontSize(opt.value)}
							class="thaana flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all duration-150
								{settings.fontSize === opt.value
									? 'bg-primary text-primary-foreground border-primary'
									: 'bg-card border-border text-foreground hover:bg-accent'}"
						>
							<Type class="w-4 h-4" />
							{opt.label}
						</button>
					{/each}
				</div>
				<!-- Preview -->
				<div class="mt-3 p-3 rounded-lg bg-card border border-border">
					<p class="thaana text-muted-foreground" style="font-size: var(--chat-font-size); line-height: 45px;">
						މިއީ ފޮންޓް ސައިޒް ޕްރީވިއު އެކެވެ.
					</p>
				</div>
			</div>
		</section>

		<div class="h-px bg-border mb-8"></div>

		<!-- Custom Instructions -->
		<section class="mb-8">
			<h2 class="thaana-heading text-xl text-foreground mb-2" style="margin-top: 6px;">ކަސްޓަމް އިރުޝާދު</h2>
			<p class="thaana text-sm text-muted-foreground mb-4">
				އޭ.އައި އަށް ކަލާ އާ ބެހޭ ގޮތުން ކިޔައިދީ، ނުވަތަ ޖަވާބު ދޭންވީ ގޮތް ބުނެދީ.
			</p>
			<Textarea
				value={settings.customInstructions}
				oninput={handleInstructionsInput}
				placeholder="މިސާލު: އަހަރެންނަކީ ދަރިވަރެއް. ކުރު ޖަވާބު ދީ..."
				class="thaana min-h-32 text-base"
				dir="rtl"
			/>
		</section>

		<div class="h-px bg-border mb-8"></div>

		<!-- Chat History -->
		<section class="mb-8">
			<h2 class="thaana-heading text-xl text-foreground mb-2" style="margin-top: 6px;">ޗެޓް ހިސްޓްރީ</h2>
			<p class="thaana text-sm text-muted-foreground mb-4">
				ހުރިހާ ޗެޓް ހިސްޓްރީ ފޮހެލާ. މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެ.
			</p>
			<button
				onclick={() => (clearDialogOpen = true)}
				class="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-sm
					hover:bg-destructive/10 transition-colors duration-150"
			>
				<Trash2 class="w-4 h-4" />
				ހުރިހާ ޗެޓް ފޮހެލާ
			</button>
		</section>

		<div class="h-px bg-border mb-8"></div>

		<!-- Connected Apps -->
		<section class="mb-8">
			<h2 class="thaana-heading text-xl text-foreground mb-2" style="margin-top: 6px;">ކަނެކްޓެޑް އެޕްސް</h2>
			<div class="flex items-center gap-3 p-4 rounded-lg bg-card border border-border opacity-60">
				<Link2 class="w-5 h-5 text-muted-foreground" />
				<span class="thaana text-sm text-muted-foreground">އަންނަނީ...</span>
			</div>
		</section>

		<div class="h-px bg-border mb-8"></div>

		<!-- Account -->
		<section>
			<h2 class="thaana-heading text-xl text-foreground mb-4" style="margin-top: 6px;">އެކައުންޓް</h2>
			{#if user}
				<div class="flex items-center gap-4 p-4 rounded-lg bg-card border border-border mb-4">
					{#if user.picture}
						<img src={user.picture} alt="" class="w-12 h-12 rounded-full ring-1 ring-ring/50 shrink-0" />
					{/if}
					<div class="flex-1 min-w-0">
						<div class="text-sm text-foreground font-medium truncate">{user.name}</div>
						<div class="text-xs text-muted-foreground truncate">{user.email}</div>
					</div>
				</div>
			{/if}
			<button
				onclick={onLogout}
				class="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm
					hover:bg-accent transition-colors duration-150"
			>
				<LogOut class="w-4 h-4" />
				ލޮގް އައުޓް
			</button>
		</section>
	</div>
</div>

<!-- Clear All Chats Confirmation -->
<Dialog.Root bind:open={clearDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title class="thaana-heading text-lg" dir="rtl" style="margin-top: 6px;">ޗެޓް ފޮހެލާ</Dialog.Title>
			<Dialog.Description class="thaana text-sm text-muted-foreground" dir="rtl">
				ހުރިހާ ޗެޓް ހިސްޓްރީ ފޮހެލަން ޔަޤީންތަ؟ މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެ.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer dir="rtl">
			<button
				onclick={() => (clearDialogOpen = false)}
				class="thaana px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors duration-150"
			>
				ކެންސަލް
			</button>
			<button
				onclick={clearAllChats}
				disabled={clearing}
				class="thaana px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors duration-150
					disabled:opacity-50"
			>
				{#if clearing}
					ފޮހެނީ...
				{:else}
					ފޮހެލާ
				{/if}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
