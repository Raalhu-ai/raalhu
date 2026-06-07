<script lang="ts">
		import { ChevronDown, RefreshCw, Waves, Plus, LogOut, EllipsisVertical, Pencil, Archive, MessageSquareDashed, MessageSquare, PanelLeft, X, FolderOpen, Sparkles, Settings, KeyRound } from 'lucide-svelte';
	import type { QuotaModel, User } from '$lib/api';
	import type { ChatSession, Project } from '$lib/db';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { modelDisplayName } from '$lib/modes';

	let {
		selectedModel = $bindable('gemini-3-flash-preview'),
			models,
			quotas,
			quotaLoading,
			modelProvider = 'code-assist',
			onRefreshQuota,
		user,
		onLogout,
		onSettings = () => {},
		onNewChat,
		sessions = [],
		activeSessionId = null,
		onSelectSession = (_id: string) => {},
		onRenameSession = (_id: string, _title: string) => {},
		onArchiveSession = (_id: string) => {},
		onToggleCollapse = () => {},
		closeMode = false,
		projects = [],
		activeProjectId = null,
		onSelectProject = (_id: string) => {},
		onCreateProject = () => {},
		onShowProjects = () => {},
		showingProjects = false,
		onShowArtifacts = () => {},
		showingArtifacts = false
	}: {
		selectedModel: string;
			models: string[];
			quotas: QuotaModel[];
			quotaLoading: boolean;
			modelProvider?: 'code-assist' | 'gemini-api';
			onRefreshQuota: () => void;
		user: User | null;
		onLogout: () => void;
		onSettings?: () => void;
		onNewChat: () => void;
		sessions?: ChatSession[];
		activeSessionId?: string | null;
		onSelectSession?: (id: string) => void;
		onRenameSession?: (id: string, title: string) => void;
		onArchiveSession?: (id: string) => void;
		onToggleCollapse?: () => void;
		closeMode?: boolean;
		projects?: Project[];
		activeProjectId?: string | null;
		onSelectProject?: (id: string) => void;
		onCreateProject?: () => void;
		onShowProjects?: () => void;
		showingProjects?: boolean;
		onShowArtifacts?: () => void;
		showingArtifacts?: boolean;
	} = $props();

	function quotaPct(q: QuotaModel): number {
		return (q.remainingFraction ?? 0) * 100;
	}

	function quotaColor(pct: number): string {
		if (pct > 40) return 'bg-gradient-to-r from-primary/80 to-primary';
		if (pct > 15) return 'bg-yellow-500';
		return 'bg-destructive';
	}

	function formatResetTime(resetTime: string): string {
		if (!resetTime) return '';
		const reset = new Date(resetTime);
		const now = new Date();
		const diffMs = reset.getTime() - now.getTime();
		if (diffMs <= 0) return 'ރީސެޓް ވަނީ...';
		const hours = Math.floor(diffMs / 3600000);
		const minutes = Math.floor((diffMs % 3600000) / 60000);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	let selectedQuota = $derived(quotas.find((q) => q.modelId === selectedModel));
	let selectedPct = $derived(selectedQuota ? quotaPct(selectedQuota) : 0);

	// --- Animated countdown for main quota bar ---
	let countdownText = $state('');

	$effect(() => {
		const resetTime = selectedQuota?.resetTime;
		if (!resetTime) {
			countdownText = '';
			return;
		}

		function update() {
			const reset = new Date(resetTime!);
			const now = new Date();
			const diffMs = reset.getTime() - now.getTime();
			if (diffMs <= 0) {
				countdownText = 'ރީސެޓް ވަނީ...';
				return;
			}
			const hours = Math.floor(diffMs / 3600000);
			const minutes = Math.floor((diffMs % 3600000) / 60000);
			const seconds = Math.floor((diffMs % 60000) / 1000);
			if (hours > 0) {
				countdownText = `${hours}ގ ${minutes}މ`;
			} else if (minutes > 0) {
				countdownText = `${minutes}މ ${seconds}ސ`;
			} else {
				countdownText = `${seconds}ސ`;
			}
		}

		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});

	// --- Rename state ---
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');

	function startRename(session: ChatSession) {
		renamingId = session.id;
		renameValue = session.title;
	}

	function submitRename() {
		if (renamingId && renameValue.trim()) {
			onRenameSession(renamingId, renameValue.trim());
		}
		renamingId = null;
		renameValue = '';
	}

	function cancelRename() {
		renamingId = null;
		renameValue = '';
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submitRename();
		} else if (e.key === 'Escape') {
			cancelRename();
		}
	}
</script>

<div class="p-2 flex flex-col gap-3 h-full">
	<!-- Branding -->
	<div class="flex items-center gap-3 shrink-0 px-2">
		<Waves class="w-10 h-10 text-primary shrink-0" />
		<span class="thaana-heading text-5xl font-normal text-primary" style="line-height: 1; margin-top: 10px; vertical-align: middle;">ރާޅު</span>
		<div class="flex-1"></div>
		<button
			onclick={onToggleCollapse}
			class="py-1.5 px-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
			title={closeMode ? 'ބަންދުކުރޭ' : 'ސައިޑްބާ ކުޑަކުރޭ'}
		>
			{#if closeMode}
				<X class="w-4 h-4" />
			{:else}
				<PanelLeft class="w-4 h-4" />
			{/if}
		</button>
	</div>

	<!-- New Chat button -->
	<button
		onclick={onNewChat}
		class="thaana flex items-center gap-2 w-full px-2 py-2 text-sm text-foreground shrink-0
			rounded-lg hover:bg-accent
			transition-all duration-150"
	>
		<Plus class="w-4 h-4 shrink-0" />
		އައު ޗެޓް
	</button>

	<!-- Navigation links -->
	<div class="flex flex-col gap-0.5 shrink-0">
		<button
			onclick={onNewChat}
			class="thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg
				transition-all duration-150
				{!showingProjects && !showingArtifacts ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}"
		>
			<MessageSquare class="w-4 h-4 shrink-0" />
			ޗެޓް
		</button>
		<button
			onclick={onShowProjects}
			class="thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg
				transition-all duration-150
				{showingProjects ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}"
		>
			<FolderOpen class="w-4 h-4 shrink-0" />
			ޕްރޮޖެކްޓް
		</button>
		<button
			onclick={onShowArtifacts}
			class="thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg
				transition-all duration-150
				{showingArtifacts ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}"
		>
			<Sparkles class="w-4 h-4 shrink-0" />
			އާޓިފެކްޓް
		</button>
	</div>

	<div class="h-px bg-border shrink-0"></div>

	<!-- Chat History (scrollable, takes remaining space) -->
	<div class="flex flex-col flex-1 min-h-0">
		<span class="thaana text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 shrink-0 px-2">ޗެޓް ހިސްޓްރީ</span>

		{#if sessions.length === 0}
			<div class="flex-1 flex flex-col items-center justify-center gap-3">
				<MessageSquareDashed class="w-14 h-14 text-muted-foreground/20" />
				<span class="thaana text-base text-muted-foreground/50">ޗެޓް ތައް</span>
			</div>
		{:else}
			<div class="flex-1 overflow-y-auto flex flex-col gap-0.5">
				{#each sessions as session (session.id)}
					<div
						class="group/item flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
							transition-all duration-150
							{activeSessionId === session.id ? 'bg-accent' : 'hover:bg-accent/50'}"
					>
						{#if renamingId === session.id}
							<input
								bind:value={renameValue}
								onkeydown={handleRenameKeydown}
								onblur={submitRename}
								class="thaana flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-background border border-border rounded
									text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
								autofocus
							/>
						{:else}
							<button
								onclick={() => onSelectSession(session.id)}
								class="flex-1 min-w-0 text-right"
							>
								<div class="thaana text-sm text-foreground truncate">{session.title}</div>
							</button>

							<div class="opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 shrink-0">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger
										class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors duration-150"
									>
										<EllipsisVertical class="w-3.5 h-3.5" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content class="w-36" align="start" side="bottom">
										<DropdownMenu.Item
											class="thaana text-xs gap-2"
											onclick={() => startRename(session)}
										>
											<Pencil class="w-3.5 h-3.5" />
											ނަން ބަދަލުކުރޭ
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="thaana text-xs gap-2 text-destructive"
											onclick={() => onArchiveSession(session.id)}
										>
											<Archive class="w-3.5 h-3.5" />
											އާކައިވް
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Bottom section: Model + Quota + User -->
	<div class="shrink-0 flex flex-col gap-3 border-t border-border pt-3 px-2">
			<!-- Quota (bar is the popover trigger) -->
			<div
				class="thaana flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs
					{modelProvider === 'gemini-api'
						? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
						: 'border-border text-muted-foreground'}"
			>
				{#if modelProvider === 'gemini-api'}
					<KeyRound class="w-3.5 h-3.5 shrink-0" />
					<span class="truncate">Gemini BYOK</span>
				{:else}
					<Sparkles class="w-3.5 h-3.5 shrink-0" />
					<span class="truncate">Code Assist ޕްރޮކްސީ</span>
				{/if}
			</div>

			<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="flex flex-col gap-1 w-full cursor-pointer rounded-lg py-1.5
					hover:bg-accent/50 transition-colors duration-150"
			>
				<div class="flex items-center gap-2">
					<div class="flex-1 min-w-0">
						<div class="h-1.5 bg-border rounded-full overflow-hidden">
							<div
								class="h-full rounded-full transition-all duration-300 {quotaColor(selectedPct)}"
								style="width: {selectedPct}%"
							></div>
						</div>
					</div>
					<span class="text-[11px] tabular-nums text-muted-foreground font-medium shrink-0">
						{Math.round(selectedPct)}%
					</span>
				</div>
					{#if countdownText}
						<div class="thaana flex items-center gap-1 text-[10px] text-muted-foreground/70 tabular-nums">
							<span>{modelProvider === 'gemini-api' ? 'ޕްރޮކްސީ ރީސެޓް:' : 'ރީސެޓް:'}</span>
							<span>{countdownText}</span>
						</div>
					{:else if modelProvider === 'gemini-api'}
						<div class="thaana text-[10px] text-muted-foreground/70">
							ޕްރޮކްސީ ފޯލްބެކް ކޯޓާ
						</div>
					{/if}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content side="top" align="end" class="w-64 p-3">
				<div class="flex items-center justify-between mb-2.5">
					<button
						onclick={onRefreshQuota}
						class="thaana inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground
							border border-border rounded-md
							hover:text-foreground hover:border-input hover:bg-accent
							transition-all duration-150"
					>
						<RefreshCw class="w-2.5 h-2.5 {quotaLoading ? 'animate-spin' : ''}" />
						ރީފްރެޝް
					</button>
						<span class="thaana text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{modelProvider === 'gemini-api' ? 'ޕްރޮކްސީ ފޯލްބެކް ކޯޓާ' : 'ކޯޓާ'}
						</span>
				</div>

				{#if quotas.length > 0}
					<div class="flex flex-col gap-2">
						{#each quotas as q}
							{@const pct = quotaPct(q)}
							{@const isSelected = q.modelId === selectedModel}
							<div class="text-xs {isSelected ? 'opacity-100' : 'opacity-70'}">
								<div class="flex justify-between mb-0.5 text-muted-foreground">
									<span class="thaana truncate text-[11px] {isSelected ? 'text-foreground font-medium' : ''}">
										{modelDisplayName(q.modelId || 'unknown')}
									</span>
									<span class="tabular-nums text-[11px] shrink-0 ms-2">{Math.round(pct)}%</span>
								</div>
								<div class="h-1 bg-border rounded-full overflow-hidden">
									<div class="h-full rounded-full transition-all duration-300 {quotaColor(pct)}" style="width: {pct}%"></div>
								</div>
								{#if q.resetTime}
									<span class="text-[9px] text-muted-foreground/60 mt-0.5 block">
										{formatResetTime(q.resetTime)}
									</span>
								{/if}
							</div>
						{/each}
					</div>
				{:else if !quotaLoading}
					<span class="thaana text-muted-foreground text-xs">ކޯޓާ ޑޭޓާ ނެތް</span>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- User profile -->
		{#if user}
			<div class="flex items-center gap-3">
				{#if user.picture}
					<img src={user.picture} alt="" class="w-7 h-7 rounded-full ring-1 ring-ring/50 shrink-0" />
				{/if}
				<div class="flex-1 min-w-0">
					<div class="text-[12px] text-foreground font-medium truncate">{user.name}</div>
					<div class="text-[10px] text-muted-foreground truncate">{user.email}</div>
				</div>
				<button
					onclick={onSettings}
					class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent
						transition-colors duration-150 shrink-0"
					aria-label="ސެޓިންގްސް"
				>
					<Settings class="w-3.5 h-3.5" />
				</button>
				<button
					onclick={onLogout}
					class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent
						transition-colors duration-150 shrink-0"
					aria-label="ލޮގްއައުޓް"
				>
					<LogOut class="w-3.5 h-3.5" />
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-3 animate-pulse">
				<div class="w-7 h-7 rounded-full bg-muted shrink-0"></div>
				<div class="flex-1 min-w-0 flex flex-col gap-1.5">
					<div class="h-3 bg-muted rounded w-24"></div>
					<div class="h-2.5 bg-muted rounded w-32"></div>
				</div>
			</div>
		{/if}
	</div>
</div>
