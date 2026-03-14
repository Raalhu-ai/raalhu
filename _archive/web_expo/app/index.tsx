import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, Button, Card } from '@raalhu/ui';
import {
	fetchMe, startLogin, exchangeCode, setupCodeAssist, fetchQuota, logout,
	listSessions, getSession, archiveSession, renameSession,
	createSession, loadAgentMessages, listProjects, createProject,
	type User, type QuotaModel, type ChatSession, type AppState, type Project,
} from '@raalhu/shared';
import { Sidebar } from '../components/Sidebar';
import { Dashboard } from '../components/Dashboard';
import { AgentChat } from '../components/AgentChat';
import { SettingsPage } from '../components/SettingsPage';
import { ProjectsListPage } from '../components/ProjectsListPage';
import { ProjectCreateDialog } from '../components/ProjectCreateDialog';
import { ProjectView } from '../components/ProjectView';
import { ArtifactsGallery } from '../components/ArtifactsGallery';
import { LandingPage } from '../components/LandingPage';
import { LoginPage } from '../components/LoginPage';
import { AboutPage } from '../components/AboutPage';
import { PrivacyPage } from '../components/PrivacyPage';
import { TermsPage } from '../components/TermsPage';
import type { ChatInputSendData } from '../components/ChatInput';
import type { UIMessage } from 'ai';
import { DEFAULT_MODEL } from '../lib/constants';

/** Convert legacy AgentMessage[] to UIMessage[] for backward compatibility */
function toUIMessages(raw: any[]): UIMessage[] {
	return raw.map((msg) => {
		// Already in UIMessage format
		if (msg.parts && Array.isArray(msg.parts)) return msg as UIMessage;

		// Legacy AgentMessage format: { id, role, content, steps? }
		const parts: any[] = [];
		if (msg.steps && msg.steps.length > 0) {
			for (const step of msg.steps) {
				if (step.kind === 'text') {
					parts.push({ type: 'text', text: step.content });
				} else if (step.kind === 'thinking') {
					parts.push({ type: 'reasoning', text: step.content || '' });
				} else if (step.kind === 'tool-call') {
					parts.push({
						type: 'dynamic-tool',
						toolName: step.name,
						toolCallId: crypto.randomUUID(),
						state: step.status === 'done' ? 'output-available' : step.status === 'error' ? 'output-error' : 'input-available',
						input: step.args || {},
						...(step.status === 'done' && step.result ? { output: step.result } : {}),
						...(step.status === 'error' && step.result ? { errorText: typeof step.result === 'string' ? step.result : JSON.stringify(step.result) } : {}),
					});
				} else if (step.kind === 'artifact') {
					// Artifacts are stored as tool outputs for present_file — skip standalone artifacts
				}
			}
		} else if (msg.content) {
			parts.push({ type: 'text', text: msg.content });
		}

		return {
			id: msg.id || crypto.randomUUID(),
			role: msg.role as 'user' | 'assistant',
			parts: parts.length > 0 ? parts : [{ type: 'text', text: msg.content || '' }],
		} as UIMessage;
	});
}

type ExtendedAppState = AppState | 'settings' | 'projects' | 'project-view' | 'artifacts' | 'login-page' | 'about' | 'privacy' | 'terms';

export default function HomeScreen() {
	const [appState, setAppState] = useState<ExtendedAppState>('loading');
	const [prevState, setPrevState] = useState<ExtendedAppState>('dashboard');
	const [user, setUser] = useState<User | null>(null);
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
	const [quotas, setQuotas] = useState<QuotaModel[]>([]);
	const [quotaExhausted, setQuotaExhausted] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [setupError, setSetupError] = useState('');
	const [loginError, setLoginError] = useState('');

	// Chat state per session
	const [chatInitialMessages, setChatInitialMessages] = useState<UIMessage[]>([]);
	const [chatInitialUserMessage, setChatInitialUserMessage] = useState('');
	const [chatTitle, setChatTitle] = useState('');

	// Projects state
	const [projects, setProjects] = useState<Project[]>([]);
	const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
	const [createProjectOpen, setCreateProjectOpen] = useState(false);

	// Mobile detection
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		setIsMobile(mq.matches);
		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);

	// Init: check auth
	useEffect(() => {
		(async () => {
			const params = new URLSearchParams(window.location.search);
			const code = params.get('code');
			const state = params.get('state');
			if (code && state) {
				try {
					await exchangeCode(code, state);
					window.history.replaceState({}, '', '/');
				} catch (err: any) {
					setLoginError(err.message);
				}
			}

			const me = await fetchMe();
			if (!me) {
				setAppState('login');
				return;
			}
			setUser(me);

			if (!me.project) {
				setAppState('setup');
				return;
			}

			setAppState('dashboard');
			const [sessionList, quotaData] = await Promise.all([
				listSessions(),
				fetchQuota().catch(() => [])
			]);
			setSessions(sessionList);
			setQuotas(quotaData);

			const mainQuota = quotaData.find(q => q.modelId === selectedModel);
			if (mainQuota && mainQuota.remainingFraction < 0.05) {
				setQuotaExhausted(true);
			}
		})();
	}, []);

	const models = quotas
		.map(q => q.modelId)
		.filter(id => !id.endsWith('_vertex'));

	const refreshSessions = useCallback(async () => {
		const list = await listSessions();
		setSessions(list);
	}, []);

	const refreshProjects = useCallback(async () => {
		const list = await listProjects();
		setProjects(list);
	}, []);

	const refreshQuota = useCallback(async () => {
		try {
			const data = await fetchQuota();
			setQuotas(data);
			const mainQuota = data.find(q => q.modelId === selectedModel);
			setQuotaExhausted(mainQuota ? mainQuota.remainingFraction < 0.05 : false);
		} catch {}
	}, [selectedModel]);

	// --- Auth actions ---
	const handleLogin = useCallback(async () => {
		try {
			setLoginError('');
			const { authUrl } = await startLogin();
			window.location.href = authUrl;
		} catch (err: any) {
			setLoginError(err.message);
		}
	}, []);

	const handleSetup = useCallback(async () => {
		try {
			setSetupError('');
			setAppState('loading');
			const result = await setupCodeAssist();
			const me = await fetchMe();
			if (me) setUser(me);
			setAppState('dashboard');

			const [sessionList, quotaData] = await Promise.all([
				listSessions(),
				fetchQuota().catch(() => [])
			]);
			setSessions(sessionList);
			setQuotas(quotaData);
		} catch (err: any) {
			if (err.message.startsWith('TOS_REQUIRED:')) {
				const tosUrl = err.message.slice(13);
				window.open(tosUrl, '_blank');
				setSetupError('ޓާމްސް އޮފް ސާވިސް ޤަބޫލު ކުރައްވާ');
			} else {
				setSetupError(err.message);
			}
			setAppState('setup');
		}
	}, []);

	const handleLogout = useCallback(async () => {
		await logout();
		setUser(null);
		setAppState('login');
		setSessions([]);
		setActiveSessionId(null);
	}, []);

	// --- Session actions ---
	const handleNewChat = useCallback(() => {
		setActiveSessionId(null);
		setChatInitialMessages([]);
		setChatInitialUserMessage('');
		setChatTitle('');
		setAppState('dashboard');
		if (isMobile) setMobileDrawerOpen(false);
	}, [isMobile]);

	const loadSession = useCallback(async (id: string) => {
		const session = await getSession(id);
		if (!session) return;

		const agentMessages = await loadAgentMessages(id);
		setActiveSessionId(id);
		setChatInitialMessages(agentMessages ? toUIMessages(agentMessages) : []);
		setChatInitialUserMessage('');
		setChatTitle(session.title);
		setSelectedModel(session.model || DEFAULT_MODEL);
		setAppState('chat');
		if (isMobile) setMobileDrawerOpen(false);
	}, [isMobile]);

	const handleDashboardSend = useCallback(async (data: ChatInputSendData) => {
		const text = data.message.trim();
		if (!text) return;

		const sessionId = crypto.randomUUID();
		const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: text };

		await createSession({
			id: sessionId,
			model: selectedModel,
			messages: [userMsg],
		});

		setActiveSessionId(sessionId);
		setChatInitialMessages([]);
		setChatInitialUserMessage(text);
		setChatTitle('');
		setAppState('chat');
		await refreshSessions();
	}, [selectedModel, refreshSessions]);

	const handleArchiveSession = useCallback(async (id: string) => {
		await archiveSession(id);
		if (activeSessionId === id) {
			handleNewChat();
		}
		await refreshSessions();
	}, [activeSessionId, handleNewChat, refreshSessions]);

	const handleRenameSession = useCallback(async (id: string, title: string) => {
		await renameSession(id, title);
		if (activeSessionId === id) setChatTitle(title);
		await refreshSessions();
	}, [activeSessionId, refreshSessions]);

	// --- Navigation actions ---
	const handleSettings = useCallback(() => {
		setPrevState(appState);
		setAppState('settings');
	}, [appState]);

	const handleNavigate = useCallback((action: 'projects' | 'artifacts') => {
		if (action === 'projects') {
			refreshProjects();
			setAppState('projects');
		} else if (action === 'artifacts') {
			setAppState('artifacts');
		}
	}, [refreshProjects]);

	const handleCreateProject = useCallback(async (name: string) => {
		await createProject({ id: crypto.randomUUID(), name });
		await refreshProjects();
	}, [refreshProjects]);

	const handleSelectProject = useCallback((id: string) => {
		setActiveProjectId(id);
		setAppState('project-view');
	}, []);

	const handleProjectStartChat = useCallback(async (text: string) => {
		const sessionId = crypto.randomUUID();
		const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: text };

		await createSession({
			id: sessionId,
			model: selectedModel,
			messages: [userMsg],
			projectId: activeProjectId || undefined,
		});

		setActiveSessionId(sessionId);
		setChatInitialMessages([]);
		setChatInitialUserMessage(text);
		setChatTitle('');
		setAppState('chat');
		await refreshSessions();
	}, [selectedModel, activeProjectId, refreshSessions]);

	// --- Render ---

	if (appState === 'loading') {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" color="#7d9fe3" />
			</View>
		);
	}

	if (appState === 'login') {
		return (
			<LandingPage
				onLogin={() => setAppState('login-page')}
				onNavigate={(page) => setAppState(page)}
			/>
		);
	}

	if (appState === 'login-page') {
		return (
			<LoginPage
				onBack={() => setAppState('login')}
				onSuccess={() => window.location.reload()}
			/>
		);
	}

	if (appState === 'about') {
		return <AboutPage onBack={() => setAppState('login')} />;
	}

	if (appState === 'privacy') {
		return <PrivacyPage onBack={() => setAppState('login')} />;
	}

	if (appState === 'terms') {
		return <TermsPage onBack={() => setAppState('login')} />;
	}

	if (appState === 'setup') {
		return (
			<View className="flex-1 items-center justify-center bg-background p-6">
				<Card className="w-full max-w-sm gap-5 p-8">
					<View className="items-center gap-2">
						<Text className="text-2xl">🌊</Text>
						<Text variant="thaana-heading" className="text-xl text-foreground">ސެޓަޕް</Text>
						<Text variant="thaana" className="text-sm text-muted-foreground text-center">
							Code Assist ޕްރޮޖެކްޓް ތައްޔާރުކުރަނީ
						</Text>
					</View>
					{setupError ? (
						<Text className="text-xs text-destructive text-center">{setupError}</Text>
					) : null}
					<Button onPress={handleSetup}>
						<Text variant="thaana" className="text-sm font-medium">ސެޓަޕް ފަށާ</Text>
					</Button>
				</Card>
			</View>
		);
	}

	// Sidebar props shared between mobile and desktop
	const sidebarProps = {
		user,
		sessions,
		activeSessionId,
		quotas,
		onNewChat: handleNewChat,
		onLoadSession: loadSession,
		onRenameSession: handleRenameSession,
		onArchiveSession: handleArchiveSession,
		onRefreshQuota: refreshQuota,
		onSettings: handleSettings,
		onLogout: handleLogout,
		onNavigate: handleNavigate,
		selectedModel,
	};

	// Main app
	return (
		<View className="flex-1 flex-row bg-background">
			{/* Mobile hamburger */}
			{isMobile && (
				<Pressable
					onPress={() => setMobileDrawerOpen(true)}
					className="absolute top-3 start-3 z-20 w-10 h-10 rounded-lg items-center justify-center bg-card border border-border"
				>
					<Text>☰</Text>
				</Pressable>
			)}

			{/* Mobile drawer */}
			{isMobile && mobileDrawerOpen && (
				<View className="absolute inset-0 z-30 flex-row">
					<Pressable
						onPress={() => setMobileDrawerOpen(false)}
						className="absolute inset-0 bg-black/50"
					/>
					<View className="z-40">
						<Sidebar
							{...sidebarProps}
							closeMode
							onClose={() => setMobileDrawerOpen(false)}
						/>
					</View>
				</View>
			)}

			{/* Desktop sidebar */}
			{!isMobile && (
				<Sidebar
					{...sidebarProps}
					collapsed={sidebarCollapsed}
					onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
				/>
			)}

			{/* Main content */}
			{appState === 'dashboard' ? (
				<Dashboard
					userName={user?.name || ''}
					model={selectedModel}
					onModelChange={setSelectedModel}
					models={models}
					quotaExhausted={quotaExhausted}
					onSend={handleDashboardSend}
				/>
			) : appState === 'chat' && activeSessionId ? (
				<AgentChat
					key={activeSessionId}
					model={selectedModel}
					onModelChange={setSelectedModel}
					models={models}
					quotaExhausted={quotaExhausted}
					sessionId={activeSessionId}
					initialMessages={chatInitialMessages}
					initialUserMessage={chatInitialUserMessage}
					title={chatTitle}
					onRename={async (t) => {
						await handleRenameSession(activeSessionId, t);
						setChatTitle(t);
					}}
					onDelete={async () => {
						await handleArchiveSession(activeSessionId);
					}}
					onRefreshSessions={refreshSessions}
				/>
			) : appState === 'settings' ? (
				<SettingsPage
					user={user}
					onLogout={handleLogout}
					onBack={() => setAppState(prevState === 'settings' ? 'dashboard' : prevState)}
					onSessionsCleared={() => {
						setSessions([]);
						setActiveSessionId(null);
					}}
				/>
			) : appState === 'projects' ? (
				<>
					<ProjectsListPage
						projects={projects}
						onSelectProject={handleSelectProject}
						onCreateProject={() => setCreateProjectOpen(true)}
					/>
					<ProjectCreateDialog
						open={createProjectOpen}
						onClose={() => setCreateProjectOpen(false)}
						onCreate={handleCreateProject}
					/>
				</>
			) : appState === 'project-view' && activeProjectId ? (
				<ProjectView
					key={activeProjectId}
					projectId={activeProjectId}
					onBack={() => { refreshProjects(); setAppState('projects'); }}
					onStartChat={handleProjectStartChat}
					onOpenSession={loadSession}
					selectedModel={selectedModel}
					onModelChange={setSelectedModel}
					models={models}
					onRefreshProjects={refreshProjects}
				/>
			) : appState === 'artifacts' ? (
				<ArtifactsGallery
					onBack={() => setAppState('dashboard')}
					onSelectCard={(prompt) => {
						handleDashboardSend({
							message: prompt,
							files: [],
							pastedContent: [],
							webSearchEnabled: false,
							style: 'normal',
						});
					}}
					onOpenSession={loadSession}
				/>
			) : null}
		</View>
	);
}
