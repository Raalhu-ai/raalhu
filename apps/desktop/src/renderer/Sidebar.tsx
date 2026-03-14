import React, { useState, useEffect } from "react";
import { modelDisplayName } from "@raalhu/shared";
import {
  Waves, Plus, PanelLeft, MessageSquare, MessageSquareDashed,
  FolderOpen, Sparkles, Settings, LogOut, EllipsisVertical,
  Pencil, Archive, RefreshCw,
} from "lucide-react";
import type { User, QuotaModel } from "./api";

/* ── Types ── */

export interface ChatSession {
  id: string;
  title: string;
}

type NavTab = "chat" | "projects" | "artifacts";

interface SidebarProps {
  user: User | null;
  sessions: ChatSession[];
  activeSessionId: string | null;
  quotas: QuotaModel[];
  quotaLoading: boolean;
  selectedModel: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onSettings: () => void;
  onLogout: () => void;
  onRefreshQuota: () => void;
  onToggleCollapse: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRenameSession?: (id: string, title: string) => void;
  onArchiveSession?: (id: string) => void;
}

function quotaPct(q: QuotaModel): number {
  return (q.remainingFraction ?? 0) * 100;
}

function quotaColor(pct: number): string {
  if (pct > 40) return "bg-primary";
  if (pct > 15) return "bg-yellow-500";
  return "bg-destructive";
}

function formatResetTime(resetTime: string): string {
  if (!resetTime) return "";
  const reset = new Date(resetTime).getTime();
  const now = Date.now();
  const diffMs = reset - now;
  if (diffMs <= 0) return "ރީސެޓް ވަނީ...";
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Sidebar({
  user,
  sessions,
  activeSessionId,
  quotas,
  quotaLoading,
  selectedModel,
  onSelectSession,
  onNewChat,
  onSettings,
  onLogout,
  onRefreshQuota,
  onToggleCollapse,
  activeTab,
  onTabChange,
  onRenameSession,
  onArchiveSession,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [countdownText, setCountdownText] = useState("");

  const selectedQuota = quotas.find((q) => q.modelId === selectedModel);
  const selectedPct = selectedQuota ? quotaPct(selectedQuota) : 0;

  // Countdown timer for quota reset
  useEffect(() => {
    const resetTime = selectedQuota?.resetTime;
    if (!resetTime) { setCountdownText(""); return; }

    function update() {
      const reset = new Date(resetTime!).getTime();
      const now = Date.now();
      const diffMs = reset - now;
      if (diffMs <= 0) { setCountdownText("ރީސެޓް ވަނީ..."); return; }
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      if (hours > 0) setCountdownText(`${hours}ގ ${minutes}މ`);
      else if (minutes > 0) setCountdownText(`${minutes}މ ${seconds}ސ`);
      else setCountdownText(`${seconds}ސ`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [selectedQuota?.resetTime]);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpenId && !quotaOpen) return;
    function handleClick() { setMenuOpenId(null); setQuotaOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId, quotaOpen]);

  function startRename(session: ChatSession) {
    setRenamingId(session.id);
    setRenameValue(session.title);
    setMenuOpenId(null);
  }

  function submitRename() {
    if (renamingId && renameValue.trim() && onRenameSession) {
      onRenameSession(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); submitRename(); }
    else if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
  }

  return (
    <div className="p-2 flex flex-col gap-3 h-full">
      {/* Branding */}
      <div className="flex items-center gap-3 shrink-0 px-2">
        <Waves className="w-10 h-10 text-primary shrink-0" />
        <span className="thaana-heading text-5xl font-normal text-primary" style={{ lineHeight: 1, marginTop: 10, verticalAlign: "middle" }}>ރާޅު</span>
        <div className="flex-1" />
        <button
          onClick={onToggleCollapse}
          className="py-1.5 px-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          title="ސައިޑްބާ ކުޑަކުރޭ"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat button */}
      <button
        onClick={onNewChat}
        className="thaana flex items-center gap-2 w-full px-2 py-2 text-sm text-foreground shrink-0
          rounded-lg hover:bg-accent transition-all duration-150"
      >
        <Plus className="w-4 h-4 shrink-0" />
        އައު ޗެޓް
      </button>

      {/* Navigation links */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => onTabChange("chat")}
          className={`thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-all duration-150
            ${activeTab === "chat" ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          ޗެޓް
        </button>
        <button
          onClick={() => onTabChange("projects")}
          className={`thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-all duration-150
            ${activeTab === "projects" ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          ޕްރޮޖެކްޓް
        </button>
        <button
          onClick={() => onTabChange("artifacts")}
          className={`thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-all duration-150
            ${activeTab === "artifacts" ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          އާޓިފެކްޓް
        </button>
      </div>

      <div className="h-px bg-border shrink-0" />

      {/* Chat History (scrollable) */}
      <div className="flex flex-col flex-1 min-h-0">
        <span className="thaana text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 shrink-0 px-2">ޗެޓް ހިސްޓްރީ</span>

        {sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageSquareDashed className="w-14 h-14 text-muted-foreground/20" />
            <span className="thaana text-base text-muted-foreground/50">ޗެޓް ތައް</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group/item flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150
                  ${activeSessionId === session.id ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                {renamingId === session.id ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={submitRename}
                    className="thaana flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-background border border-border rounded
                      text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
                    autoFocus
                  />
                ) : (
                  <>
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="flex-1 min-w-0 text-right"
                    >
                      <div className="thaana text-sm text-foreground truncate">{session.title}</div>
                    </button>

                    <div className="relative opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === session.id ? null : session.id); }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors duration-150"
                      >
                        <EllipsisVertical className="w-3.5 h-3.5" />
                      </button>
                      {menuOpenId === session.id && (
                        <div
                          className="absolute end-0 top-full mt-1 w-36 bg-popover border border-border rounded-lg shadow-lg py-1 z-50"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => startRename(session)}
                            className="thaana flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            ނަން ބަދަލުކުރޭ
                          </button>
                          <button
                            onClick={() => { onArchiveSession?.(session.id); setMenuOpenId(null); }}
                            className="thaana flex items-center gap-2 w-full px-3 py-1.5 text-xs text-destructive hover:bg-accent transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            އާކައިވް
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom section: Quota + User */}
      <div className="shrink-0 flex flex-col gap-3 border-t border-border pt-3 px-2">
        {/* Quota bar */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setQuotaOpen(!quotaOpen); }}
            className="flex flex-col gap-1 w-full cursor-pointer rounded-lg py-1.5 px-2
              hover:bg-accent/50 transition-colors duration-150 bg-transparent border-none text-start"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${quotaColor(selectedPct)}`}
                    style={{ width: `${selectedPct}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground font-medium shrink-0">
                {Math.round(selectedPct)}%
              </span>
            </div>
            {countdownText && (
              <div className="thaana flex items-center gap-1 text-[10px] text-muted-foreground/70 tabular-nums">
                <span>ރީސެޓް:</span>
                <span>{countdownText}</span>
              </div>
            )}
          </button>

          {/* Quota dropdown */}
          {quotaOpen && (
            <div
              className="fixed bottom-16 right-2 w-60 max-h-[70vh] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg p-3 z-50"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2.5">
                <button
                  onClick={onRefreshQuota}
                  className="thaana inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground
                    border border-border rounded-md hover:text-foreground hover:border-input hover:bg-accent transition-all duration-150"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${quotaLoading ? "animate-spin" : ""}`} />
                  ރީފްރެޝް
                </button>
                <span className="thaana text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ކޯޓާ</span>
              </div>

              {quotas.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {quotas.map((q) => {
                    const pct = quotaPct(q);
                    const isSelected = q.modelId === selectedModel;
                    return (
                      <div key={q.modelId} className={`text-xs ${isSelected ? "opacity-100" : "opacity-70"}`}>
                        <div className="flex justify-between mb-0.5 text-muted-foreground">
                          <span className={`thaana truncate text-[11px] ${isSelected ? "text-foreground font-medium" : ""}`}>
                            {modelDisplayName(q.modelId || "unknown")}
                          </span>
                          <span className="tabular-nums text-[11px] shrink-0 ms-2">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${quotaColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                        {q.resetTime && (
                          <span className="text-[9px] text-muted-foreground/60 mt-0.5 block">
                            {formatResetTime(q.resetTime)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !quotaLoading ? (
                <span className="thaana text-muted-foreground text-xs">ކޯޓާ ޑޭޓާ ނެތް</span>
              ) : null}
            </div>
          )}
        </div>

        {/* User profile */}
        {user ? (
          <div className="flex items-center gap-3">
            {user.picture && (
              <img src={user.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-ring/50 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-foreground font-medium truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
            <button
              onClick={onSettings}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 shrink-0"
              aria-label="ސެޓިންގްސް"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 shrink-0"
              aria-label="ލޮގްއައުޓް"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="h-3 bg-muted rounded w-24" />
              <div className="h-2.5 bg-muted rounded w-32" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
