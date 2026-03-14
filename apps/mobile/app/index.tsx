import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import LoginPage from "../src/screens/LoginPage";
import Dashboard from "../src/screens/Dashboard";
import SettingsPage from "../src/screens/SettingsPage";
import ChatScreen from "../src/screens/ChatScreen";
import Sidebar, { type ChatSession } from "../src/components/Sidebar";
import {
  fetchMe,
  fetchQuota,
  setupCodeAssist,
  logout,
  type User,
  type QuotaModel,
} from "../src/api";
import {
  createSession,
  listSessions as dbListSessions,
  renameSession as dbRenameSession,
  archiveSession as dbArchiveSession,
  type ChatSessionRow,
} from "../src/chat-history";
import Svg, { Path } from "react-native-svg";
import { Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AppState = "loading" | "landing" | "login" | "setup" | "dashboard" | "settings" | "chat";
type NavTab = "chat" | "projects" | "artifacts";

function WavesIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <Path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <Path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </Svg>
  );
}

/** Convert SQLite rows to sidebar ChatSession format */
function toSidebarSessions(rows: ChatSessionRow[]): ChatSession[] {
  return rows.map((r) => ({ id: r.id, title: r.title }));
}

export default function HomeScreen() {
  const [state, setState] = useState<AppState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const [quotas, setQuotas] = useState<QuotaModel[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<NavTab>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupTosUrl, setSetupTosUrl] = useState("");

  const models = quotas.map((q) => q.modelId);

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
      setQuotas(q);
    } catch (err) {
      console.error("[Quota] Error:", err);
      setQuotas([]);
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  /** Refresh sessions from SQLite */
  const refreshSessions = useCallback(() => {
    try {
      const rows = dbListSessions();
      setSessions(toSidebarSessions(rows));
    } catch (err) {
      console.error("[Sessions] Error loading:", err);
    }
  }, []);

  /* Initial auth check */
  useEffect(() => {
    fetchMe().then(async (u) => {
      if (!u) {
        setState("landing");
        return;
      }
      setUser(u);

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

      setState("dashboard");
      loadQuota();
    });
  }, [loadQuota]);

  // Load sessions on mount and when returning to dashboard
  useEffect(() => {
    if (state === "dashboard") {
      refreshSessions();
    }
  }, [state, refreshSessions]);

  async function handleSetup() {
    setSetupLoading(true);
    setSetupError("");
    setSetupTosUrl("");
    try {
      const result = await setupCodeAssist();
      setUser((u) => (u ? { ...u, project: result.project, tier: result.tier } : u));
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

  async function handleLogout() {
    await logout();
    setUser(null);
    setState("landing");
  }

  function handleNewChat() {
    setActiveSessionId(null);
    setInitialMessage(undefined);
    setActiveTab("chat");
    setState("dashboard");
  }

  /* --- Loading --- */
  if (state === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="rgb(125,159,227)" />
      </View>
    );
  }

  /* --- Landing --- */
  if (state === "landing") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <View className="items-center gap-6">
            <WavesIcon color="rgb(125,159,227)" size={40} />
            <Text
              className="text-7xl text-center text-primary"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", lineHeight: 90 }}
            >
              ރާޅު
            </Text>
            <Text
              className="text-base text-muted-foreground text-center"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 28 }}
            >
              ދިވެހިންނަށް ހާއްސަ އޭ.އައި އެސިސްޓެންޓް
            </Text>
            <Pressable
              onPress={() => setState("login")}
              className="mt-4 px-8 h-12 bg-primary rounded-xl items-center justify-center active:opacity-90"
            >
              <Text
                className="text-primary-foreground font-semibold text-lg"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                ފަށައިގަންނަވާ
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* --- Login --- */
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
          });
        }}
      />
    );
  }

  /* --- Setup --- */
  if (state === "setup") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-muted border border-border rounded-xl p-8 w-full max-w-md items-center">
            <WavesIcon color="rgb(125,159,227)" size={40} />
            <Text
              className="text-xl font-semibold mt-4 mb-2"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl" }}
            >
              ރާޅު ސެޓަޕް
            </Text>
            <Text
              className="text-muted-foreground text-sm text-center mb-6"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
            >
              ޖެމިނީ ޕްރޮޖެކްޓް ސެޓަޕް ކުރަންޖެހޭ. މިއީ އެއް ފަހަރުގެ ކަމެއް.
            </Text>
            <Pressable
              onPress={handleSetup}
              disabled={setupLoading}
              className="flex-row items-center gap-2 px-6 py-2.5 bg-primary rounded-lg active:opacity-90"
              style={{ opacity: setupLoading ? 0.4 : 1 }}
            >
              {setupLoading && (
                <ActivityIndicator size="small" color="rgb(10,21,48)" />
              )}
              <Text
                className="text-primary-foreground font-semibold"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                {setupLoading ? "ސެޓަޕް ކުރަނީ..." : "ރާޅު ސެޓަޕް"}
              </Text>
            </Pressable>
            {setupError ? (
              <View className="mt-4 p-3 rounded-lg bg-destructive/15 w-full">
                <Text
                  className="text-destructive text-sm text-center"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 22 }}
                >
                  {setupError}
                </Text>
                {setupTosUrl ? (
                  <Pressable
                    onPress={() => WebBrowser.openBrowserAsync(setupTosUrl)}
                    className="mt-1"
                  >
                    <Text className="text-destructive text-sm underline text-center">
                      {setupTosUrl}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* --- Settings --- */
  if (state === "settings") {
    return (
      <SettingsPage
        user={user}
        onLogout={handleLogout}
        onBack={() => setState("dashboard")}
      />
    );
  }

  /* --- Chat --- */
  if (state === "chat" && activeSessionId) {
    return (
      <ChatScreen
        sessionId={activeSessionId}
        model={selectedModel}
        models={models.length > 0 ? models : [
          "gemini-3-flash-preview",
          "gemini-2.5-flash",
          "gemini-2.5-pro",
        ]}
        initialMessage={initialMessage}
        onBack={() => {
          setInitialMessage(undefined);
          setState("dashboard");
        }}
        onModelChange={setSelectedModel}
        onTitleChange={(id, title) => {
          setSessions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, title } : s))
          );
        }}
      />
    );
  }

  /* --- Dashboard (main app) --- */
  return (
    <>
      <Dashboard
        userName={user?.name ?? ""}
        onSendMessage={(text) => {
          const sessionId = crypto.randomUUID();
          const title = text.slice(0, 50) || "\u0797\u07AC\u0793\u07B0";

          // Create session in SQLite
          createSession(sessionId, selectedModel, title);

          const session: ChatSession = { id: sessionId, title };
          setSessions((prev) => [session, ...prev]);
          setActiveSessionId(sessionId);
          setInitialMessage(text);
          setState("chat");
        }}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        models={models.length > 0 ? models : [
          "gemini-3-flash-preview",
          "gemini-2.5-flash",
          "gemini-2.5-pro",
        ]}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        sessions={sessions}
        activeSessionId={activeSessionId}
        quotas={quotas}
        quotaLoading={quotaLoading}
        selectedModel={selectedModel}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setInitialMessage(undefined);
          setSidebarOpen(false);
          setState("chat");
        }}
        onNewChat={() => {
          setSidebarOpen(false);
          handleNewChat();
        }}
        onSettings={() => {
          setSidebarOpen(false);
          setState("settings");
        }}
        onLogout={handleLogout}
        onRefreshQuota={loadQuota}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
          setState("dashboard");
        }}
        onRenameSession={(id, title) => {
          dbRenameSession(id, title);
          setSessions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, title } : s))
          );
        }}
        onArchiveSession={(id) => {
          dbArchiveSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
          if (activeSessionId === id) {
            setActiveSessionId(null);
          }
        }}
      />
    </>
  );
}
