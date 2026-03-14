import React, { useState, useRef, useCallback } from "react";
import { loadSettings, saveSettings, applyFontSize, applyTheme, type Settings } from "./settings";
import {
  ArrowRight, Sun, Moon, Monitor, Type, Trash2, LogOut, Link2,
} from "lucide-react";
import type { User } from "./api";

/* ── Component ── */

const themeOptions: { value: Settings["theme"]; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: "light", label: "އަލި", Icon: Sun },
  { value: "dark", label: "އަނދިރި", Icon: Moon },
  { value: "system", label: "ސިސްޓަމް", Icon: Monitor },
];

const fontSizeOptions: { value: Settings["fontSize"]; label: string }[] = [
  { value: "small", label: "ކުޑަ" },
  { value: "medium", label: "މެދު" },
  { value: "large", label: "ބޮޑު" },
];

interface SettingsPageProps {
  user: User | null;
  onLogout: () => void;
  onBack: () => void;
}

export default function SettingsPage({ user, onLogout, onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveSettings(next), 100);
  }

  function setTheme(theme: Settings["theme"]) {
    update({ theme });
    saveSettings({ ...settings, theme });
    applyTheme(theme);
  }

  function setFontSize(fontSize: Settings["fontSize"]) {
    update({ fontSize });
    saveSettings({ ...settings, fontSize });
    applyFontSize(fontSize);
  }

  function handleInstructionsInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    update({ customInstructions: e.target.value });
  }

  async function clearAllChats() {
    setClearing(true);
    try {
      // TODO: integrate with Dexie when chat history is wired up
      localStorage.removeItem("mogger_sessions");
      setClearDialogOpen(false);
    } catch (err) {
      console.error("Failed to clear chats:", err);
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
              aria-label="ފަހަތަށް"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="thaana-heading text-3xl text-foreground" style={{ marginTop: 8 }}>ސެޓިންގްސް</h1>
          </div>

          {/* Appearance */}
          <section className="mb-8">
            <h2 className="thaana-heading text-xl text-foreground mb-4" style={{ marginTop: 6 }}>ފެންނަ ގޮތް</h2>

            {/* Theme */}
            <div className="mb-5">
              <label className="thaana text-sm text-muted-foreground mb-2 block">ތީމް</label>
              <div className="flex gap-2">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`thaana flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all duration-150
                      ${settings.theme === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-accent"}`}
                  >
                    <opt.Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="thaana text-sm text-muted-foreground mb-2 block">ފޮންޓް ސައިޒް</label>
              <div className="flex gap-2">
                {fontSizeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    className={`thaana flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all duration-150
                      ${settings.fontSize === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-accent"}`}
                  >
                    <Type className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className="mt-3 p-3 rounded-lg bg-card border border-border">
                <p className="thaana text-muted-foreground" style={{ fontSize: "var(--chat-font-size)", lineHeight: "45px" }}>
                  މިއީ ފޮންޓް ސައިޒް ޕްރީވިއު އެކެވެ.
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-border mb-8" />

          {/* Custom Instructions */}
          <section className="mb-8">
            <h2 className="thaana-heading text-xl text-foreground mb-2" style={{ marginTop: 6 }}>ކަސްޓަމް އިރުޝާދު</h2>
            <p className="thaana text-sm text-muted-foreground mb-4">
              އޭ.އައި އަށް ކަލާ އާ ބެހޭ ގޮތުން ކިޔައިދީ، ނުވަތަ ޖަވާބު ދޭންވީ ގޮތް ބުނެދީ.
            </p>
            <textarea
              value={settings.customInstructions}
              onChange={handleInstructionsInput}
              placeholder="މިސާލު: އަހަރެންނަކީ ދަރިވަރެއް. ކުރު ޖަވާބު ދީ..."
              dir="rtl"
              className="thaana w-full min-h-32 text-base bg-background border border-border rounded-lg px-3 py-2
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40 resize-y"
            />
          </section>

          <div className="h-px bg-border mb-8" />

          {/* Chat History */}
          <section className="mb-8">
            <h2 className="thaana-heading text-xl text-foreground mb-2" style={{ marginTop: 6 }}>ޗެޓް ހިސްޓްރީ</h2>
            <p className="thaana text-sm text-muted-foreground mb-4">
              ހުރިހާ ޗެޓް ހިސްޓްރީ ފޮހެލާ. މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެ.
            </p>
            <button
              onClick={() => setClearDialogOpen(true)}
              className="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-sm
                hover:bg-destructive/10 transition-colors duration-150"
            >
              <Trash2 className="w-4 h-4" />
              ހުރިހާ ޗެޓް ފޮހެލާ
            </button>
          </section>

          <div className="h-px bg-border mb-8" />

          {/* Connected Apps */}
          <section className="mb-8">
            <h2 className="thaana-heading text-xl text-foreground mb-2" style={{ marginTop: 6 }}>ކަނެކްޓެޑް އެޕްސް</h2>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border opacity-60">
              <Link2 className="w-5 h-5 text-muted-foreground" />
              <span className="thaana text-sm text-muted-foreground">އަންނަނީ...</span>
            </div>
          </section>

          <div className="h-px bg-border mb-8" />

          {/* Account */}
          <section>
            <h2 className="thaana-heading text-xl text-foreground mb-4" style={{ marginTop: 6 }}>އެކައުންޓް</h2>
            {user && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border mb-4">
                {user.picture && (
                  <img src={user.picture} alt="" className="w-12 h-12 rounded-full ring-1 ring-ring/50 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              className="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm
                hover:bg-accent transition-colors duration-150"
            >
              <LogOut className="w-4 h-4" />
              ލޮގް އައުޓް
            </button>
          </section>
        </div>
      </div>

      {/* Clear All Chats Confirmation Dialog */}
      {clearDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setClearDialogOpen(false)}>
          <div
            className="bg-popover border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <h3 className="thaana-heading text-lg text-foreground mb-2" style={{ marginTop: 6 }}>ޗެޓް ފޮހެލާ</h3>
            <p className="thaana text-sm text-muted-foreground mb-6">
              ހުރިހާ ޗެޓް ހިސްޓްރީ ފޮހެލަން ޔަޤީންތަ؟ މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެ.
            </p>
            <div className="flex gap-2 justify-start">
              <button
                onClick={() => setClearDialogOpen(false)}
                className="thaana px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors duration-150"
              >
                ކެންސަލް
              </button>
              <button
                onClick={clearAllChats}
                disabled={clearing}
                className="thaana px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors duration-150
                  disabled:opacity-50"
              >
                {clearing ? "ފޮހެނީ..." : "ފޮހެލާ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
