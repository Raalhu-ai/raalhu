import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { englishToThaana } from "@raalhu/shared/src/transliterate";
import type { UIMessage } from "ai";
import type { Project } from "./storage";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import Sidebar, { type ChatSession } from "./Sidebar";
import SettingsPage from "./SettingsPage";
import { AgentChat } from "./components/AgentChat";
import { ProjectCreateDialog } from "./components/ProjectCreateDialog";
import { ProjectsListPage } from "./components/ProjectsListPage";
import { ProjectView } from "./components/ProjectView";
import { ArtifactsGallery } from "./components/ArtifactsGallery";
import { fetchMe, fetchQuota, setupCodeAssist, logout, clearSession, API_BASE, authHeaders, type User, type QuotaModel } from "./api";
import { applyFontSize, applyTheme } from "./settings";
import { PanelLeft, Plus, Waves, Loader2 } from "lucide-react";
import { configureAgent } from "./agent/retry";
import {
  listSessions, createSession, loadAgentMessages, flushDesktopStorage,
  renameSession, archiveSession, updateSessionTitle,
  listProjects, createProject as createProjectInDb,
} from "./storage";

import type { ByokStatus } from '../byok-types';
import { startMemoryJob } from './memory-job';
import { isByokReady, providerModels, compatibleModel, prepareProviderSession } from './provider-session';

type AppState = "loading" | "landing" | "login" | "setup" | "dashboard" | "chat" | "settings" | "projects" | "project-view" | "artifacts";
type NavTab = "chat" | "projects" | "artifacts";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const memoryModelRef = useRef(selectedModel);
  memoryModelRef.current = selectedModel;
  const memoryReady = !!user && !['loading', 'landing', 'login', 'setup'].includes(state);
  useEffect(() => {
    if (memoryReady) return startMemoryJob(() => memoryModelRef.current);
  }, [memoryReady]);
  const [byokStatus, setByokStatus] = useState<ByokStatus | null>(null);
  const usingByok = isByokReady(byokStatus);
  const providerRef = useRef(false);
  providerRef.current = usingByok;
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const authEpoch = useRef(0);
  const quotaEpoch = useRef(0);
  const [quotas, setQuotas] = useState<QuotaModel[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("mogger_sidebar") === "collapsed"
  );
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => sessionStorage.getItem("mogger_active_session"));
  const [activeTab, setActiveTab] = useState<NavTab>("chat");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupTosUrl, setSetupTosUrl] = useState("");
  const [chatInitialMessages, setChatInitialMessages] = useState<UIMessage[]>([]);
  const [chatInitialUserMessage, setChatInitialUserMessage] = useState("");
  const [chatTitle, setChatTitle] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const showSetupError = useCallback((err: { message?: string }, blocking = true) => {
    setSetupTosUrl("");
    const msg = err.message || "Setup failed";
    if (msg.startsWith("TOS_REQUIRED:")) {
      setSetupTosUrl(msg.slice("TOS_REQUIRED:".length));
      setSetupError("ފުރަތަމަ ޓާރމްސް އޮފް ސާރވިސް ޤަބޫލުކުރައްވާ، ދެން އަލުން މަސައްކަތް ކުރައްވާ.");
    } else if (msg.startsWith("VERIFICATION_REQUIRED:")) {
      setSetupTosUrl(msg.slice("VERIFICATION_REQUIRED:".length));
      setSetupError("Google requires account verification before Antigravity can be used.");
    } else {
      setSetupError(msg);
    }
    if (blocking) setState("setup");
  }, []);

  const models = useMemo(() => providerModels(usingByok, quotas), [usingByok, quotas]);
  const activeModel = compatibleModel(selectedModel, models);

  // Persist active session ID
  useEffect(() => {
    if (activeSessionId) {
      sessionStorage.setItem("mogger_active_session", activeSessionId);
    } else {
      sessionStorage.removeItem("mogger_active_session");
    }
  }, [activeSessionId]);

  // Clamp restored proxy-only IDs before a chat can send its initial request.
  useEffect(() => {
    if ((usingByok || quotas.length > 0) && selectedModel !== activeModel) setSelectedModel(activeModel);
  }, [selectedModel, activeModel, usingByok, quotas.length]);

  const loadQuota = useCallback(async () => {
    const request = ++quotaEpoch.current;
    if (providerRef.current || !userRef.current?.project) {
      setQuotas([]);
      setQuotaLoading(false);
      return;
    }
    setQuotaLoading(true);
    try {
      const q = await fetchQuota();
      if (request === quotaEpoch.current && !providerRef.current) setQuotas(q);
    } catch {
      if (request === quotaEpoch.current) setQuotas([]);
    } finally {
      if (request === quotaEpoch.current) setQuotaLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuota(); }, [usingByok, user?.project, loadQuota]);

  // Load desktop SQLite sessions
  const refreshSessions = useCallback(async () => {
    try {
      const all = await listSessions();
      setSessions(all.map((s) => ({ id: s.id, title: s.title })));
    } catch (err) {
      console.error("[Sessions] Error:", err);
    }
  }, []);

  // Load desktop SQLite projects
  const refreshProjects = useCallback(async () => {
    try {
      const all = await listProjects();
      setProjects(all);
    } catch (err) {
      console.error("[Projects] Error:", err);
    }
  }, []);

  const openRequest = useRef(0);
  const setupInFlight = useRef<{ epoch: number; request: ReturnType<typeof setupCodeAssist> } | null>(null);
  const setupProxy = useCallback(() => {
    const epoch = authEpoch.current;
    if (setupInFlight.current?.epoch === epoch) return setupInFlight.current.request;
    const request = setupCodeAssist().finally(() => {
      if (setupInFlight.current?.request === request) setupInFlight.current = null;
    });
    setupInFlight.current = { epoch, request };
    return request;
  }, []);
  const openSession = useCallback(async (id: string) => {
    const request = ++openRequest.current;
    try {
      await flushDesktopStorage();
      const [saved, all] = await Promise.all([loadAgentMessages(id), listSessions()]);
      if (request !== openRequest.current) return;
      const match = all.find(session => session.id === id);
      if (!match) return;
      // Mount the new chat only after its messages have loaded. Mounting earlier
      // would let autosave write the previous conversation into the new session.
      setChatInitialMessages(saved as UIMessage[]);
      setChatInitialUserMessage("");
      setChatTitle(match.title);
      setSelectedModel(match.model);
      setActiveSessionId(id);
      setState(saved.length ? "chat" : "dashboard");
    } catch (error) {
      console.error("Could not open conversation:", error);
      alert("Could not save or open this conversation. Please try again.");
    }
  }, []);

  const completeLogin = useCallback(async (u: User | null, restore: boolean, epoch: number) => {
    const status = await window.platform?.byok.status().catch(() => null) ?? null;
    if (epoch !== authEpoch.current) return;
    setByokStatus(status);
    providerRef.current = isByokReady(status);
    if (!u) {
      setUser(null);
      setState(sessionStorage.getItem("oauth_state") ? "login" : "landing");
      return;
    }
    setUser(u);
    try {
      const ready = await prepareProviderSession(u, status, setupProxy);
      if (epoch !== authEpoch.current || !ready) return;
      setUser(ready.user);
      ready.background?.then(updated => {
        if (epoch === authEpoch.current) setUser(updated);
      }).catch(error => {
        if (epoch !== authEpoch.current) return;
        // Keep BYOK usable even if proxy provisioning needs ToS or is unsupported.
        showSetupError(error instanceof Error ? error : { message: 'Proxy setup is unavailable.' }, false);
      });
      void refreshSessions();
      void refreshProjects();
      if (restore) {
        const id = sessionStorage.getItem('mogger_active_session');
        if (id) {
          const [all, saved] = await Promise.all([listSessions(), loadAgentMessages(id)]);
          if (epoch !== authEpoch.current) return;
          const match = all.find(session => session.id === id);
          if (match && saved.length) {
            setActiveSessionId(id);
            setChatInitialMessages(saved as UIMessage[]);
            setChatInitialUserMessage('');
            setChatTitle(match.title);
            setSelectedModel(match.model);
            setState('chat');
            return;
          }
        }
      }
      setState('dashboard');
    } catch (error: any) {
      if (epoch === authEpoch.current) showSetupError(error, !providerRef.current);
    }
  }, [refreshSessions, refreshProjects, showSetupError, setupProxy]);

  useEffect(() => {
    applyFontSize();
    applyTheme();
    configureAgent({
      apiBase: API_BASE,
      getAuthHeaders: authHeaders,
      onReauthRequired: () => {
        authEpoch.current++;
        openRequest.current++;
        clearSession();
        setUser(null);
        setState('login');
      },
    });
    const epoch = ++authEpoch.current;
    fetchMe().then(u => completeLogin(u, true, epoch)).catch(() => {
      if (epoch === authEpoch.current) setState('login');
    });
    return () => { authEpoch.current++; };
  }, [completeLogin]);

  const handleByokChange = useCallback((status: ByokStatus) => {
    const becameReady = isByokReady(status) && !providerRef.current;
    providerRef.current = isByokReady(status);
    setByokStatus(status);
    const currentUser = userRef.current;
    if (!becameReady || !currentUser || currentUser.project) return;
    const epoch = authEpoch.current;
    void setupProxy().then(result => {
      if (epoch === authEpoch.current) setUser({ ...currentUser, project: result.project, tier: result.tier });
    }).catch(error => {
      if (epoch === authEpoch.current) showSetupError(error instanceof Error ? error : { message: 'Proxy setup is unavailable.' }, false);
    });
  }, [setupProxy, showSetupError]);

  // Settings stays accessible so users blocked by proxy setup can configure BYOK.
  useEffect(() => {
    if (!user || usingByok || user.project || ['loading', 'settings', 'setup', 'login', 'landing'].includes(state)) return;
    setState('setup');
  }, [user, usingByok, state]);

  // Keyboard shortcuts from main process
  useEffect(() => {
    if (!window.platform?.onShortcut) return;
    return window.platform.onShortcut((action) => {
      if (!userRef.current) return;
      if (action === "new-chat") handleNewChat();
      if (action === "settings") setState("settings");
    });
  }, []);

  // Window title
  useEffect(() => {
    if (state === "chat") {
      document.title = chatTitle ? `${chatTitle} - ރާޅު` : "ރާޅު";
    } else if (state === "projects" || state === "project-view") {
      document.title = "ޕްރޮޖެކްޓް - ރާޅު";
    } else if (state === "artifacts") {
      document.title = "އާޓިފެކްޓް - ރާޅު";
    } else {
      document.title = "ރާޅު";
    }
  }, [state, chatTitle]);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("mogger_sidebar", next ? "collapsed" : "expanded");
  }

  async function handleLogout() {
    authEpoch.current++;
    openRequest.current++;
    quotaEpoch.current++;
    await logout();
    setUser(null);
    setState("landing");
  }

  function handleNewChat() {
    openRequest.current++;
    setActiveSessionId(null);
    setChatInitialMessages([]);
    setChatInitialUserMessage("");
    setChatTitle("");
    setActiveTab("chat");
    setState("dashboard");
  }

  async function handleSetup() {
    if (!user) return;
    setSetupLoading(true);
    setSetupError('');
    setSetupTosUrl('');
    await completeLogin(user, false, authEpoch.current);
    setSetupLoading(false);
  }

  // --- Loading ---
  if (state === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  // --- Landing (not logged in) ---
  if (state === "landing") {
    return <LandingPage onGetStarted={() => setState("login")} />;
  }

  // --- Login ---
  if (state === "login" || !user) {
    return (
      <LoginPage
        onBack={() => setState("landing")}
        onLoginSuccess={async () => {
          const epoch = ++authEpoch.current;
          const u = await fetchMe();
          if (!u) throw new Error('Could not verify your session. Please sign in again.');
          await completeLogin(u, false, epoch);
        }}
      />
    );
  }

  // --- Setup (Code Assist TOS / provisioning) ---
  if (state === "setup") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-fade-in-up bg-muted border border-border rounded-xl p-10 text-center max-w-md">
          <Waves className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="thaana-heading text-xl font-semibold mb-2">ރާޅު ސެޓަޕް</h2>
          <p className="thaana text-muted-foreground text-sm mb-6">ޖެމިނީ ޕްރޮޖެކްޓް ސެޓަޕް ކުރަންޖެހޭ. މިއީ އެއް ފަހަރުގެ ކަމެއް.</p>
          <button
            onClick={handleSetup}
            disabled={setupLoading}
            className="thaana inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg
              hover:bg-primary/90 transition-colors duration-150 disabled:opacity-40"
          >
            {setupLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                ސެޓަޕް ކުރަނީ...
              </>
            ) : (
              "ރާޅު ސެޓަޕް"
            )}
          </button>
          <button onClick={() => setState('settings')} className="thaana block mx-auto mt-4 text-sm text-primary underline underline-offset-4">
            އަމިއްލަ ކީ ސެޓް ކުރޭ
          </button>
          {setupError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/15 text-destructive text-sm thaana">
              {setupError}
              {setupTosUrl && (
                <a
                  href={setupTosUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    window.platform?.openExternal(setupTosUrl);
                  }}
                  className="underline block mt-1"
                >
                  {setupTosUrl}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main app shell (dashboard / settings) with sidebar ---
  return (
    <div className="desktop-app-shell h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {sidebarCollapsed ? (
        /* Collapsed sidebar - icon strip */
        <aside className="desktop-sidebar desktop-sidebar-collapsed flex flex-col items-center py-4 gap-1 w-14 border-e border-border bg-card shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
            title="ސައިޑްބާ ފުޅާކުރޭ"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="h-px w-6 bg-border my-1" />
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
            title="އައު ޗެޓް"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          {user?.picture && (
            <img src={user.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-ring/50" />
          )}
        </aside>
      ) : (
        /* Expanded sidebar */
        <aside className="desktop-sidebar flex flex-col w-[260px] h-full border-e border-border bg-card shrink-0 overflow-hidden">
          <Sidebar
            user={user}
            sessions={sessions}
            activeSessionId={activeSessionId}
            usingByok={usingByok}
            quotas={usingByok ? [] : quotas}
            quotaLoading={!usingByok && quotaLoading}
            selectedModel={activeModel}
            onSelectSession={openSession}
            onNewChat={handleNewChat}
            onSettings={() => setState("settings")}
            onLogout={handleLogout}
            onRefreshQuota={loadQuota}
            onToggleCollapse={toggleSidebar}
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === "projects") {
                refreshProjects();
                setState("projects");
              } else if (tab === "artifacts") {
                setState("artifacts");
              } else {
                setState("dashboard");
              }
            }}
            onRenameSession={async (id, title) => {
              await renameSession(id, title);
              setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, title } : s))
              );
            }}
            onArchiveSession={async (id) => {
              await archiveSession(id);
              setSessions((prev) => prev.filter((s) => s.id !== id));
              if (activeSessionId === id) {
                setActiveSessionId(null);
                setState("dashboard");
              }
            }}
          />
        </aside>
      )}

      {/* Main content */}
      <div className="desktop-main-content flex flex-1 flex-col overflow-hidden">
        {state === "settings" ? (
          <SettingsPage
            user={user}
            onLogout={handleLogout}
            onByokChange={handleByokChange}
            onBack={() => setState("dashboard")}
            onChatsCleared={() => { setSessions([]); setActiveSessionId(null); setChatInitialMessages([]); }}
          />
        ) : state === "chat" && activeSessionId ? (
            <AgentChat
              key={activeSessionId}
              model={activeModel}
              onModelChange={setSelectedModel}
              models={models}
              quotaExhausted={false}
              sessionId={activeSessionId}
              initialMessages={chatInitialMessages}
              initialUserMessage={chatInitialUserMessage}
              title={chatTitle}
              onRename={async (newTitle) => {
                setChatTitle(newTitle);
                await renameSession(activeSessionId, newTitle);
                refreshSessions();
              }}
              onRefreshSessions={refreshSessions}
            />
        ) : state === "projects" ? (
            <>
              <ProjectsListPage
                projects={projects}
                onSelectProject={(id) => {
                  setActiveProjectId(id);
                  setState("project-view");
                }}
                onCreateProject={() => setShowCreateDialog(true)}
              />
              <ProjectCreateDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreate={async (name) => {
                  await createProjectInDb({ id: crypto.randomUUID(), name });
                  await refreshProjects();
                }}
              />
            </>
        ) : state === "project-view" && activeProjectId ? (
            <ProjectView
              key={activeProjectId}
              projectId={activeProjectId}
              onBack={() => {
                refreshProjects();
                setState("projects");
              }}
              onStartChat={async (text) => {
                const sessionId = crypto.randomUUID();
                const shortTitle = englishToThaana(text.slice(0, 50)) || "ޗެޓް";
                await createSession({
                  id: sessionId,
                  model: activeModel,
                  projectId: activeProjectId,
                  messages: [{ id: crypto.randomUUID(), role: "user", content: text }],
                });
                setSessions((prev) => [{ id: sessionId, title: shortTitle }, ...prev]);
                setActiveSessionId(sessionId);
                setChatInitialMessages([]);
                setChatInitialUserMessage(text);
                setChatTitle(shortTitle);
                setState("chat");
              }}
              onOpenSession={openSession}
              selectedModel={activeModel}
              onModelChange={setSelectedModel}
              models={models}
              onRefreshProjects={refreshProjects}
            />
        ) : state === "artifacts" ? (
            <ArtifactsGallery
              onBack={() => setState("dashboard")}
              onSelectCard={async (prompt) => {
                const sessionId = crypto.randomUUID();
                const shortTitle = englishToThaana(prompt.slice(0, 50)) || "ޗެޓް";
                await createSession({
                  id: sessionId,
                  model: activeModel,
                  messages: [{ id: crypto.randomUUID(), role: "user", content: prompt }],
                });
                setSessions((prev) => [{ id: sessionId, title: shortTitle }, ...prev]);
                setActiveSessionId(sessionId);
                setChatInitialMessages([]);
                setChatInitialUserMessage(prompt);
                setChatTitle(shortTitle);
                setState("chat");
              }}
              onOpenSession={openSession}
            />
        ) : (
            <Dashboard
              userName={user?.name ?? ""}
              onSendMessage={async (text) => {
                const sessionId = crypto.randomUUID();
                const shortTitle = englishToThaana(text.slice(0, 50)) || "ޗެޓް";

                // Create the desktop SQLite session
                await createSession({
                  id: sessionId,
                  model: activeModel,
                  messages: [{ id: crypto.randomUUID(), role: "user", content: text }],
                });

                setSessions((prev) => [{ id: sessionId, title: shortTitle }, ...prev]);
                setActiveSessionId(sessionId);
                setChatInitialMessages([]);
                setChatInitialUserMessage(text);
                setChatTitle(shortTitle);
                setState("chat");
              }}
              selectedModel={activeModel}
              onModelChange={setSelectedModel}
              models={models}
            />
        )}
      </div>
    </div>
  );
}
