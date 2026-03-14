import React, { useState, useEffect, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import type { Project } from "@raalhu/shared";
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
import { fetchMe, fetchQuota, setupCodeAssist, logout, API_BASE, authHeaders, type User, type QuotaModel } from "./api";
import { applyFontSize, applyTheme } from "./settings";
import { PanelLeft, Plus, Waves, Loader2 } from "lucide-react";
import { configureAgent } from "./agent/retry";
import {
  listSessions, createSession, loadAgentMessages,
  renameSession, archiveSession, updateSessionTitle,
  listProjects, createProject as createProjectInDb,
} from "@raalhu/shared";

type AppState = "loading" | "landing" | "login" | "setup" | "dashboard" | "chat" | "settings" | "projects" | "project-view" | "artifacts";
type NavTab = "chat" | "projects" | "artifacts";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const [quotas, setQuotas] = useState<QuotaModel[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("mogger_sidebar") === "collapsed"
  );
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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

  const models = quotas.map((q) => q.modelId);

  // Persist active session ID
  useEffect(() => {
    if (activeSessionId) {
      sessionStorage.setItem("mogger_active_session", activeSessionId);
    } else {
      sessionStorage.removeItem("mogger_active_session");
    }
  }, [activeSessionId]);

  // Keep selectedModel valid
  useEffect(() => {
    if (models.length > 0 && !models.includes(selectedModel)) {
      const DEFAULT = "gemini-3-flash-preview";
      setSelectedModel(models.includes(DEFAULT) ? DEFAULT : models[0]);
    }
  }, [models, selectedModel]);

  const loadQuota = useCallback(async () => {
    setQuotaLoading(true);
    try {
      const q = await fetchQuota();
      console.log("[Quota] Loaded:", q.length, "models", q.map(m => `${m.modelId}=${Math.round((m.remainingFraction ?? 0) * 100)}%`));
      setQuotas(q);
    } catch (err) {
      console.error("[Quota] Error:", err);
      setQuotas([]);
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  // Load sessions from Dexie
  const refreshSessions = useCallback(async () => {
    try {
      const all = await listSessions();
      setSessions(all.map((s) => ({ id: s.id, title: s.title })));
    } catch (err) {
      console.error("[Sessions] Error:", err);
    }
  }, []);

  // Load projects from Dexie
  const refreshProjects = useCallback(async () => {
    try {
      const all = await listProjects();
      setProjects(all);
    } catch (err) {
      console.error("[Projects] Error:", err);
    }
  }, []);

  // Init
  useEffect(() => {
    applyFontSize();
    applyTheme();

    // Configure agent retry module with API base and auth headers
    configureAgent({
      apiBase: API_BASE,
      getAuthHeaders: authHeaders,
    });

    fetchMe().then(async (u) => {
      if (!u) {
        setState("landing");
        return;
      }
      setUser(u);

      // Setup Code Assist if needed
      if (!u.project) {
        try {
          const result = await setupCodeAssist();
          setUser({ ...u, project: result.project, tier: result.tier });
        } catch (err: any) {
          setState("setup");
          const msg = err.message || "Setup failed";
          if (msg.startsWith("TOS_REQUIRED:")) {
            setSetupTosUrl(msg.slice("TOS_REQUIRED:".length));
            setSetupError("ފުރަތަމަ ޓާރމްސް އޮފް ސާރވިސް ޤަބޫލުކުރައްވާ، ދެން އަލުން މަސައްކަތް ކުރައްވާ.");
          } else {
            setSetupError(msg);
          }
          return;
        }
      }

      loadQuota();
      refreshSessions().then(async () => {
        // Try to restore previous session
        const savedId = sessionStorage.getItem("mogger_active_session");
        if (savedId) {
          const allSessions = await listSessions();
          const match = allSessions.find((s) => s.id === savedId);
          if (match) {
            const saved = await loadAgentMessages(savedId);
            if (saved && saved.length > 0) {
              setActiveSessionId(savedId);
              setChatInitialMessages(saved as UIMessage[]);
              setChatInitialUserMessage("");
              setChatTitle(match.title);
              setState("chat");
              return;
            }
          }
        }
        setState("dashboard");
      });
      refreshProjects();
    });
  }, [loadQuota, refreshSessions, refreshProjects]);

  // Keyboard shortcuts from main process
  useEffect(() => {
    if (!window.platform?.onShortcut) return;
    return window.platform.onShortcut((action) => {
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
    await logout();
    setUser(null);
    setState("landing");
  }

  function handleNewChat() {
    setActiveSessionId(null);
    setChatInitialMessages([]);
    setChatInitialUserMessage("");
    setChatTitle("");
    setActiveTab("chat");
    setState("dashboard");
  }

  async function handleSetup() {
    setSetupLoading(true);
    setSetupError("");
    setSetupTosUrl("");
    try {
      const result = await setupCodeAssist();
      setUser((u) => u ? { ...u, project: result.project, tier: result.tier } : u);
      setState("dashboard");
      loadQuota();
    } catch (err: any) {
      const msg = err.message || "Setup failed";
      if (msg.startsWith("TOS_REQUIRED:")) {
        setSetupTosUrl(msg.slice("TOS_REQUIRED:".length));
        setSetupError("ފުރަތަމަ ޓާރމްސް އޮފް ސާރވިސް ޤަބޫލުކުރައްވާ، ދެން އަލުން މަސައްކަތް ކުރައްވާ.");
      } else {
        setSetupError(msg);
      }
    } finally {
      setSetupLoading(false);
    }
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
  if (state === "login") {
    return (
      <LoginPage
        onBack={() => setState("landing")}
        onLoginSuccess={() => {
          fetchMe().then(async (u) => {
            if (!u) return;
            setUser(u);
            if (!u.project) {
              try {
                const result = await setupCodeAssist();
                setUser({ ...u, project: result.project, tier: result.tier });
              } catch {
                // Setup can be retried later
              }
            }
            setState("dashboard");
            loadQuota();
            refreshSessions();
            refreshProjects();
          });
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
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {sidebarCollapsed ? (
        /* Collapsed sidebar - icon strip */
        <aside className="flex flex-col items-center py-4 gap-1 w-14 border-e border-border bg-card shrink-0">
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
        <aside className="flex flex-col w-[260px] h-full border-e border-border bg-card shrink-0 overflow-hidden">
          <Sidebar
            user={user}
            sessions={sessions}
            activeSessionId={activeSessionId}
            quotas={quotas}
            quotaLoading={quotaLoading}
            selectedModel={selectedModel}
            onSelectSession={async (id) => {
              setActiveSessionId(id);
              const session = sessions.find((s) => s.id === id);
              setChatTitle(session?.title || "");

              // Load saved messages
              const saved = await loadAgentMessages(id);
              if (saved && saved.length > 0) {
                setChatInitialMessages(saved as UIMessage[]);
                setChatInitialUserMessage("");
                setState("chat");
              } else {
                setChatInitialMessages([]);
                setChatInitialUserMessage("");
                setState("dashboard");
              }
            }}
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
            onRenameSession={(id, title) => {
              setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, title } : s))
              );
            }}
            onArchiveSession={(id) => {
              setSessions((prev) => prev.filter((s) => s.id !== id));
              if (activeSessionId === id) {
                setActiveSessionId(null);
              }
            }}
          />
        </aside>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {state === "settings" ? (
          <SettingsPage
            user={user}
            onLogout={handleLogout}
            onBack={() => setState("dashboard")}
          />
        ) : state === "chat" && activeSessionId ? (
            <AgentChat
              key={activeSessionId}
              model={selectedModel}
              onModelChange={setSelectedModel}
              models={models.length > 0 ? models : [
                "gemini-3-flash-preview",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
              ]}
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
                const shortTitle = text.slice(0, 50) || "ޗެޓް";
                await createSession({
                  id: sessionId,
                  model: selectedModel,
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
              onOpenSession={async (id) => {
                setActiveSessionId(id);
                const saved = await loadAgentMessages(id);
                if (saved && saved.length > 0) {
                  setChatInitialMessages(saved as UIMessage[]);
                  setChatInitialUserMessage("");
                  setState("chat");
                }
              }}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              models={models.length > 0 ? models : [
                "gemini-3-flash-preview",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
              ]}
              onRefreshProjects={refreshProjects}
            />
        ) : state === "artifacts" ? (
            <ArtifactsGallery
              onBack={() => setState("dashboard")}
              onSelectCard={async (prompt) => {
                const sessionId = crypto.randomUUID();
                const shortTitle = prompt.slice(0, 50) || "ޗެޓް";
                await createSession({
                  id: sessionId,
                  model: selectedModel,
                  messages: [{ id: crypto.randomUUID(), role: "user", content: prompt }],
                });
                setSessions((prev) => [{ id: sessionId, title: shortTitle }, ...prev]);
                setActiveSessionId(sessionId);
                setChatInitialMessages([]);
                setChatInitialUserMessage(prompt);
                setChatTitle(shortTitle);
                setState("chat");
              }}
              onOpenSession={async (id) => {
                setActiveSessionId(id);
                const saved = await loadAgentMessages(id);
                if (saved && saved.length > 0) {
                  setChatInitialMessages(saved as UIMessage[]);
                  setChatInitialUserMessage("");
                  setState("chat");
                }
              }}
            />
        ) : (
            <Dashboard
              userName={user?.name ?? ""}
              onSendMessage={async (text) => {
                const sessionId = crypto.randomUUID();
                const shortTitle = text.slice(0, 50) || "ޗެޓް";

                // Create session in Dexie
                await createSession({
                  id: sessionId,
                  model: selectedModel,
                  messages: [{ id: crypto.randomUUID(), role: "user", content: text }],
                });

                setSessions((prev) => [{ id: sessionId, title: shortTitle }, ...prev]);
                setActiveSessionId(sessionId);
                setChatInitialMessages([]);
                setChatInitialUserMessage(text);
                setChatTitle(shortTitle);
                setState("chat");
              }}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              models={models.length > 0 ? models : [
                "gemini-3-flash-preview",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
              ]}
            />
        )}
      </div>
    </div>
  );
}
