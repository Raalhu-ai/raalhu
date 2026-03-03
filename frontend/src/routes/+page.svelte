<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchMe, setupCodeAssist, fetchQuota, logout, type User, type QuotaModel } from '$lib/api';
	import { Loader2, Waves, Menu, PanelLeft, Plus } from 'lucide-svelte';
	import AgentChat from '$lib/components/AgentChat.svelte';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import ModeDashboard from '$lib/components/ModeDashboard.svelte';
	import SidebarContent from '$lib/components/SidebarContent.svelte';
	import ProjectView from '$lib/components/ProjectView.svelte';
	import ProjectsListPage from '$lib/components/ProjectsListPage.svelte';
	import ProjectCreatePage from '$lib/components/ProjectCreatePage.svelte';
	import ArtifactsPage from '$lib/components/ArtifactsPage.svelte';
	import ArtifactCreatePage from '$lib/components/ArtifactCreatePage.svelte';
	import InspirationDetailPage from '$lib/components/InspirationDetailPage.svelte';
	import { getInspirationCard } from '$lib/inspiration-cards';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { ChatSession, Project } from '$lib/db';
	import {
		createSession,
		listSessions,
		getSession,
		renameSession,
		archiveSession,
		fetchAITitle,
		updateSessionTitle,
		loadAgentMessages
	} from '$lib/chat-history';
	import { listProjects, createProject as createProjectStore, getProject, verifyFilePermission } from '$lib/project-store';
	import type { AgentMessage } from '$lib/agent/types';
	import type { ProjectContext } from '$lib/project-context';

	// --- App state ---
	let appState = $state<'loading' | 'login' | 'setup' | 'dashboard' | 'chat' | 'project'>('loading');
	let user = $state<User | null>(null);
	let selectedModel = $state('gemini-3-flash-preview');
	let quotas = $state<QuotaModel[]>([]);
	let quotaLoading = $state(false);
	let setupLoading = $state(false);
	let setupError = $state('');
	let setupTosUrl = $state('');
	let sidebarOpen = $state(false);
	let sidebarCollapsed = $state(false);
	let showingProjects = $state(false);
	let showingArtifacts = $state(false);

	// --- Agent state ---
	let agentInitialMessages = $state<AgentMessage[]>([]);
	let pendingUserMessage = $state('');
	let activeProjectContext = $state<ProjectContext | undefined>(undefined);

	// --- Session history ---
	let sessions = $state<ChatSession[]>([]);
	let activeSessionId = $state<string | null>(null);

	// --- Projects ---
	let projects = $state<Project[]>([]);
	let activeProjectId = $state<string | null>(null);
	let activeProject = $state<Project | null>(null);
	let creatingProject = $state(false);
	let creatingArtifact = $state(false);
	let selectedInspirationId = $state<string | null>(null);

	async function refreshSessions() {
		sessions = await listSessions();
	}

	async function refreshProjects() {
		projects = await listProjects();
	}

	const DEFAULT_MODEL = 'gemini-3-flash-preview';
	const models = $derived(quotas.map((q) => q.modelId));

	// When quotas load, ensure selectedModel is valid
	$effect(() => {
		if (models.length > 0 && !models.includes(selectedModel)) {
			selectedModel = models.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : models[0];
		}
	});

	const activeSessionTitle = $derived(
		activeSessionId ? sessions.find((s) => s.id === activeSessionId)?.title ?? '' : ''
	);

	const selectedModelQuota = $derived(
		quotas.find((q) => q.modelId === selectedModel)
	);

	const quotaExhausted = $derived(
		selectedModelQuota ? (selectedModelQuota.remainingFraction ?? 0) < 0.05 : false
	);

	// --- Init ---
	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		localStorage.setItem('mogger_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
	}

	onMount(async () => {
		sidebarCollapsed = localStorage.getItem('mogger_sidebar') === 'collapsed';

		refreshSessions();
		refreshProjects();

		// Auth check (network)
		user = await fetchMe();
		if (!user) {
			appState = 'login';
			return;
		}
		if (!user.project) {
			try {
				const result = await setupCodeAssist();
				user = { ...user, project: result.project, tier: result.tier };
			} catch (err: any) {
				appState = 'setup';
				const msg = err.message || 'Setup failed';
				if (msg.startsWith('TOS_REQUIRED:')) {
					setupTosUrl = msg.slice('TOS_REQUIRED:'.length);
					setupError = 'ފުރަތަމަ ޓާރމްސް އޮފް ސާރވިސް ޤަބޫލުކުރައްވާ، ދެން އަލުން މަސައްކަތް ކުރައްވާ.';
				} else {
					setupError = msg;
				}
				return;
			}
		}

		// Resume session from hard refresh (/chat/[id] redirect)
		const resumeId = sessionStorage.getItem('mogger_resume');
		if (resumeId) {
			sessionStorage.removeItem('mogger_resume');
			const loaded = await loadSession(resumeId);
			if (loaded) {
				history.replaceState(history.state, '', `/chat/${resumeId}`);
				loadQuota();
				return;
			}
		}

		// Resume project from hard refresh (/project/[id] redirect)
		const resumeProjectId = sessionStorage.getItem('mogger_resume_project');
		if (resumeProjectId) {
			sessionStorage.removeItem('mogger_resume_project');
			await openProject(resumeProjectId);
			loadQuota();
			return;
		}

		appState = 'dashboard';
		loadQuota();
	});

	// --- Setup ---
	async function handleSetup() {
		setupLoading = true;
		setupError = '';
		setupTosUrl = '';
		try {
			const result = await setupCodeAssist();
			user = { ...user!, project: result.project, tier: result.tier };
			appState = 'dashboard';
			loadQuota();
		} catch (err: any) {
			const msg = err.message || 'Setup failed';
			if (msg.startsWith('TOS_REQUIRED:')) {
				setupTosUrl = msg.slice('TOS_REQUIRED:'.length);
				setupError = 'ފުރަތަމަ ޓާރމްސް އޮފް ސާރވިސް ޤަބޫލުކުރައްވާ، ދެން އަލުން މަސައްކަތް ކުރައްވާ.';
			} else {
				setupError = msg;
			}
		} finally {
			setupLoading = false;
		}
	}

	// --- Quota ---
	async function loadQuota() {
		quotaLoading = true;
		try {
			quotas = await fetchQuota();
		} catch (err) {
			console.error('[Quota] Error:', err);
			quotas = [];
		} finally {
			quotaLoading = false;
		}
	}

	// --- Logout ---
	async function handleLogout() {
		await logout();
		user = null;
		appState = 'login';
	}

	// --- Projects ---
	async function handleCreateProject(name: string, instructions: string) {
		const id = crypto.randomUUID();
		await createProjectStore({ id, name, instructions: instructions || undefined });
		await refreshProjects();
		creatingProject = false;
		await openProject(id);
	}

	async function openProject(id: string) {
		const proj = await getProject(id);
		if (!proj) return;
		activeProjectId = id;
		activeProject = proj;
		activeSessionId = null;
		agentInitialMessages = [];
		pendingUserMessage = '';
		activeProjectContext = undefined;
		appState = 'project';
		sidebarOpen = false;
		history.replaceState(history.state, '', `/project/${id}`);
	}

	async function buildProjectContext(projectId: string): Promise<ProjectContext | undefined> {
		const proj = await getProject(projectId);
		if (!proj) return undefined;
		const accessibleFiles = [];
		for (const file of proj.files) {
			if (await verifyFilePermission(file.handle)) {
				accessibleFiles.push(file);
			}
		}
		return { name: proj.name, instructions: proj.instructions, memory: proj.memory || '', files: accessibleFiles };
	}

	// --- Dashboard send message → start agent session ---
	async function onDashboardSendMessage(text: string) {
		const sessionId = crypto.randomUUID();
		activeSessionId = sessionId;
		agentInitialMessages = [];
		pendingUserMessage = text;

		// Build project context if chat is started from a project
		if (activeProjectId) {
			activeProjectContext = await buildProjectContext(activeProjectId);
		} else {
			activeProjectContext = undefined;
		}

		// Create session BEFORE transitioning — prevents saveAgentMessages race
		const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: text };
		await createSession({
			id: sessionId,
			model: selectedModel,
			messages: [userMsg],
			projectId: activeProjectId || undefined,
		});
		refreshSessions();

		appState = 'chat';
		history.replaceState(history.state, '', `/chat/${sessionId}`);
	}

	async function startChatInProject(text: string) {
		await onDashboardSendMessage(text);
	}

	const ARTIFACT_CATEGORY_PROMPTS: Record<string, string> = {
		apps: 'އެޕް ނުވަތަ ވެބްސައިޓެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން ކޮން ކަހަލަ އެޕެއް/ވެބްސައިޓެއްކަން ސާފުކުރޭ، އެކީ ކޮން ފީޗާތަކެއްކަން ހޯދާ. ދެން އެ މައުލޫމާތު ބޭނުންކޮށްގެން ހަދާދީ.',
		documents: 'ޑޮކިއުމެންޓެއް ނުވަތަ ޓެމްޕްލޭޓެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން ކޮން ކަހަލަ ޑޮކިއުމެންޓެއްކަން ހޯދާ. ދެން އެ މައުލޫމާތު ބޭނުންކޮށްގެން ހަދާދީ.',
		games: 'ގޭމެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން ކޮން ކަހަލަ ގޭމެއްކަން ހޯދާ. ދެން އެ މައުލޫމާތު ބޭނުންކޮށްގެން ހަދާދީ.',
		productivity: 'ޕްރޮޑަކްޓިވިޓީ ޓޫލެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން ކޮން ކަހަލަ ޓޫލެއްކަން ހޯދާ. ދެން ހަދާދީ.',
		creative: 'ކްރިއޭޓިވް ޕްރޮޖެކްޓެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން ކޮން ކަހަލަ ޕްރޮޖެކްޓެއްކަން ހޯދާ. ދެން ހަދާދީ.',
		quiz: 'ކުއިޒެއް ނުވަތަ ސާވޭއެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން މައުޟޫއާއި ސުވާލު ތައް ހޯދާ. ދެން ހަދާދީ.',
		scratch: 'އާޓިފެކްޓެއް ހަދާދީ. ފުރަތަމަ ask_user_input ޓޫލް ބޭނުންކޮށްގެން ކޮން އެއްޗެއްކަން ހޯދާ. ދެން ހަދާދީ.'
	};

	async function handleArtifactCategorySelect(categoryId: string) {
		creatingArtifact = false;
		showingArtifacts = false;
		const prompt = ARTIFACT_CATEGORY_PROMPTS[categoryId] || ARTIFACT_CATEGORY_PROMPTS.scratch;
		await onDashboardSendMessage(prompt);
	}

	async function resetToDashboard(keepTab = false) {
		activeSessionId = null;
		activeProjectId = null;
		activeProject = null;
		activeProjectContext = undefined;
		agentInitialMessages = [];
		pendingUserMessage = '';
		creatingProject = false;
		creatingArtifact = false;
		selectedInspirationId = null;
		if (!keepTab) { showingProjects = false; showingArtifacts = false; }
		appState = 'dashboard';
	}

	async function goBackToDashboard() {
		const wasProject = appState === 'project';
		await resetToDashboard(wasProject);
		if (wasProject) showingProjects = true;
		history.replaceState(history.state, '', '/');
	}

	// --- Resume a session from history ---
	async function loadSession(id: string): Promise<boolean> {
		const session = await getSession(id);
		if (!session) return false;

		// Load all data BEFORE setting activeSessionId — {#key} remounts AgentChat
		// immediately when activeSessionId changes, so props must be ready first
		const agentMsgs = await loadAgentMessages(id);
		const msgs = agentMsgs || [];
		let projId: string | null = null;
		let proj: Project | null = null;
		let projCtx: ProjectContext | undefined = undefined;

		if (session.projectId) {
			projId = session.projectId;
			proj = (await getProject(session.projectId)) ?? null;
			projCtx = await buildProjectContext(session.projectId);
		}

		// Set all state then trigger render — activeSessionId last since {#key} depends on it
		agentInitialMessages = msgs;
		pendingUserMessage = '';
		activeProjectId = projId;
		activeProject = proj;
		activeProjectContext = projCtx;
		activeSessionId = id;
		appState = 'chat';
		sidebarOpen = false;
		return true;
	}

	async function resumeSession(id: string) {
		const loaded = await loadSession(id);
		if (loaded) history.replaceState(history.state, '', `/chat/${id}`);
	}

	// --- Rename / Archive handlers ---
	async function handleRename(id: string, title: string) {
		await renameSession(id, title);
		await refreshSessions();
	}

	async function handleArchive(id: string) {
		await archiveSession(id);
		await refreshSessions();
		if (activeSessionId === id) {
			activeSessionId = null;
			agentInitialMessages = [];
			pendingUserMessage = '';
			activeProjectContext = undefined;
			appState = 'dashboard';
			history.replaceState(history.state, '', '/');
		}
	}
</script>

{#if appState === 'loading'}
	<div class="flex items-center justify-center h-dvh">
		<Loader2 class="w-8 h-8 animate-spin text-primary" />
	</div>

{:else if appState === 'login'}
	<LandingPage />

{:else if appState === 'setup'}
	<div class="flex items-center justify-center h-dvh">
		<div class="animate-fade-in-up bg-muted border border-border rounded-xl p-10 text-center max-w-md">
			<Waves class="w-10 h-10 text-primary mx-auto mb-4" />
			<h2 class="thaana-heading text-xl font-semibold mb-2">ރާޅު ސެޓަޕް</h2>
			<p class="thaana text-muted-foreground text-sm mb-6">ޖެމިނީ ޕްރޮޖެކްޓް ސެޓަޕް ކުރަންޖެހޭ. މިއީ އެއް ފަހަރުގެ ކަމެއް.</p>
			<button
				onclick={handleSetup}
				disabled={setupLoading}
				class="thaana inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg
					hover:bg-primary/90 transition-colors duration-150 disabled:opacity-40"
			>
				{#if setupLoading}
					<Loader2 class="w-4 h-4 animate-spin" />
					ސެޓަޕް ކުރަނީ...
				{:else}
					ރާޅު ސެޓަޕް
				{/if}
			</button>
			{#if setupError}
				<div class="mt-4 p-3 rounded-lg bg-destructive/15 text-destructive text-sm thaana">
					{setupError}
					{#if setupTosUrl}
						<a href={setupTosUrl} target="_blank" class="underline block mt-1">{setupTosUrl}</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>

{:else if appState === 'dashboard' || appState === 'chat' || appState === 'project'}
	<div class="flex h-dvh">
		<!-- Desktop sidebar -->
		<aside class="hidden lg:flex lg:flex-col border-e border-border bg-card shrink-0 overflow-hidden transition-[width] duration-200 ease-out {sidebarCollapsed ? 'w-14' : 'w-[260px]'}">
			{#if sidebarCollapsed}
				<div class="flex flex-col items-center py-4 gap-1 h-full">
					<button
						onclick={toggleSidebar}
						class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
						title="ސައިޑްބާ ފުޅާކުރޭ"
					>
						<PanelLeft class="w-5 h-5" />
					</button>
					<div class="h-px w-6 bg-border my-1"></div>
					<button
						onclick={goBackToDashboard}
						class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
						title="އައު ޗެޓް"
					>
						<Plus class="w-4 h-4" />
					</button>
					<div class="flex-1"></div>
					{#if user?.picture}
						<img src={user.picture} alt="" class="w-7 h-7 rounded-full ring-1 ring-ring/50" />
					{/if}
				</div>
			{:else}
				<SidebarContent
					bind:selectedModel
					{models}
					{quotas}
					{quotaLoading}
					onRefreshQuota={loadQuota}
					{user}
					onLogout={handleLogout}
					onNewChat={() => { showingProjects = false; showingArtifacts = false; goBackToDashboard(); }}
					{sessions}
					{activeSessionId}
					onSelectSession={resumeSession}
					onRenameSession={handleRename}
					onArchiveSession={handleArchive}
					onToggleCollapse={toggleSidebar}
					{projects}
					{activeProjectId}
					onSelectProject={openProject}
					onCreateProject={() => { creatingProject = true; showingProjects = true; showingArtifacts = false; appState = 'dashboard'; }}
					onShowProjects={() => { showingArtifacts = false; showingProjects = true; resetToDashboard(true); history.replaceState(history.state, '', '/'); }}
					{showingProjects}
					onShowArtifacts={() => { showingProjects = false; showingArtifacts = true; resetToDashboard(true); history.replaceState(history.state, '', '/'); }}
					{showingArtifacts}
				/>
			{/if}
		</aside>

		<!-- Main content -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Mobile hamburger -->
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="lg:hidden fixed top-3 start-3 z-40 p-2 bg-card/80 backdrop-blur-md border border-border rounded-lg
					text-muted-foreground hover:text-foreground hover:bg-accent
					transition-all duration-150 shadow-sm"
			>
				<Menu class="w-5 h-5" />
			</button>

			<!-- Quota warning banner -->
			{#if quotaExhausted}
				<div class="px-4 py-2 bg-destructive/15 text-destructive text-xs text-center shrink-0 border-b border-destructive/20">
					<span class="thaana">ކޯޓާ %5 އަށް ވުރެ ދަށް. މެސެޖް ފޮނުވޭކަށް ނެތް.</span>
				</div>
			{/if}

			{#if appState === 'dashboard' && showingArtifacts && selectedInspirationId}
				{@const card = getInspirationCard(selectedInspirationId)}
				{#if card}
					<InspirationDetailPage
						{card}
						onBack={() => { selectedInspirationId = null; }}
						onUse={(prompt) => { selectedInspirationId = null; showingArtifacts = false; onDashboardSendMessage(prompt); }}
					/>
				{/if}
			{:else if appState === 'dashboard' && showingArtifacts && creatingArtifact}
				<ArtifactCreatePage onSelect={handleArtifactCategorySelect} />
			{:else if appState === 'dashboard' && showingArtifacts}
				<ArtifactsPage
					onNewArtifact={() => { creatingArtifact = true; }}
					onSelectCard={(id) => { selectedInspirationId = id; }}
					onOpenSession={(sessionId) => { showingArtifacts = false; resumeSession(sessionId); }}
				/>
			{:else if appState === 'dashboard' && showingProjects && creatingProject}
				<ProjectCreatePage
					onCreate={handleCreateProject}
					onCancel={() => { creatingProject = false; }}
				/>
			{:else if appState === 'dashboard' && showingProjects}
				<ProjectsListPage
					{projects}
					onSelectProject={openProject}
					onCreateProject={() => { creatingProject = true; }}
				/>
			{:else if appState === 'dashboard'}
				<ModeDashboard
					userName={user?.name ?? ''}
					onSendMessage={onDashboardSendMessage}
					bind:selectedModel
					{models}
					{activeProject}
				/>
			{:else if appState === 'project' && activeProjectId}
				<ProjectView
					projectId={activeProjectId}
					onBack={goBackToDashboard}
					onStartChat={startChatInProject}
					onOpenSession={resumeSession}
					bind:selectedModel
					{models}
					onRefreshProjects={refreshProjects}
				/>
			{:else if appState === 'chat' && activeSessionId}
				{#key activeSessionId}
				<div class="flex-1 overflow-hidden h-full">
					<AgentChat
						bind:model={selectedModel}
						{models}
						{quotaExhausted}
						sessionId={activeSessionId}
						initialMessages={agentInitialMessages}
						initialUserMessage={pendingUserMessage}
						title={activeSessionTitle}
						projectContext={activeProjectContext}
						onRename={(newTitle) => activeSessionId && handleRename(activeSessionId, newTitle)}
						onDelete={() => activeSessionId && handleArchive(activeSessionId)}
						onRefreshSessions={refreshSessions}
						onArtifactOpen={() => { sidebarOpen = false; sidebarCollapsed = true; }}
					/>
				</div>
				{/key}
			{/if}
		</div>
	</div>

	<!-- Mobile sidebar drawer -->
	<Sheet.Root bind:open={sidebarOpen}>
		<Sheet.Content>
			<div class="flex-1 min-h-0">
				<SidebarContent
					bind:selectedModel
					{models}
					{quotas}
					{quotaLoading}
					onRefreshQuota={loadQuota}
					{user}
					onLogout={handleLogout}
					onNewChat={() => { showingProjects = false; showingArtifacts = false; sidebarOpen = false; goBackToDashboard(); }}
					{sessions}
					{activeSessionId}
					onSelectSession={resumeSession}
					onRenameSession={handleRename}
					onArchiveSession={handleArchive}
					closeMode
					onToggleCollapse={() => sidebarOpen = false}
					{projects}
					{activeProjectId}
					onSelectProject={(id) => { sidebarOpen = false; openProject(id); }}
					onCreateProject={() => { sidebarOpen = false; creatingProject = true; showingProjects = true; showingArtifacts = false; appState = 'dashboard'; }}
					onShowProjects={() => { sidebarOpen = false; showingArtifacts = false; showingProjects = true; resetToDashboard(true); history.replaceState(history.state, '', '/'); }}
					{showingProjects}
					onShowArtifacts={() => { sidebarOpen = false; showingProjects = false; showingArtifacts = true; resetToDashboard(true); history.replaceState(history.state, '', '/'); }}
					{showingArtifacts}
				/>
			</div>
		</Sheet.Content>
	</Sheet.Root>

{/if}
