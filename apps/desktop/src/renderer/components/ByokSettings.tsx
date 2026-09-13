import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import type { ByokStatus } from '../../byok-types';

export default function ByokSettings({ onStatusChange }: { onStatusChange?: (status: ByokStatus) => void }) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<ByokStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const api = window.platform?.byok;
    if (!api) {
      setError("Open the desktop app to manage your API key.");
      return;
    }
    api.status().then(value => {
      if (active) { setStatus(value); setError(value.lastError); onStatusChange?.(value); }
    }).catch(() => {
      if (active) setError("Could not load API key settings. Reopen Settings to try again.");
    });
    return () => { active = false; };
  }, [onStatusChange]);

  async function changeKey(action: "save" | "remove" | "test") {
    const api = window.platform?.byok;
    if (!api || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === 'test' && key.trim()) {
        const saved = await api.save(key.trim());
        setStatus(saved);
        onStatusChange?.(saved);
        setKey('');
      }
      const next = action === "save" ? await api.save(key.trim()) : action === 'test' ? await api.test() : await api.remove();
      setStatus(next);
      onStatusChange?.(next);
      setKey("");
      setError(next.lastError);
      setMessage(action === "save" ? "API key saved on this device. It has not been tested yet." : action === 'test'
        ? next.lastError ? '' : 'Google API key test passed.' : "API key removed.");
    } catch {
      setError(action === 'test' ? 'Could not test the key. Check secure storage and your connection, then try again.' : action === "save" ? "Could not save the API key. Check that secure storage is available and try again." : "Could not remove the API key. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function selectRoute(route: 'proxy' | 'byok') {
    const api = window.platform?.byok;
    if (!api || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = await api.setPreferredRoute(route);
      setStatus(next);
      onStatusChange?.(next);
    }
    catch { setError('Could not change provider. Test your saved key and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <section className="mb-8" aria-labelledby="byok-heading">
      <h2 id="byok-heading" className="thaana-heading text-xl text-foreground mb-2" style={{ marginTop: 6 }}>
        އަމިއްލަ ކީތައް <span className="font-sans text-base" dir="ltr">(BYOK)</span>
      </h2>
      <p className="thaana text-sm text-muted-foreground mb-4">ގޫގުލް AI Studio އޭޕީއައި ކީ މި ޑިވައިސްގައި ސޭވް ކުރޭ.</p>

      <div className="p-4 rounded-lg bg-card border border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium" dir="ltr">
            <KeyRound className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Google AI Studio
          </div>
          <span className="text-xs text-muted-foreground rounded-full border border-border px-3 py-1" dir="ltr">
            {status ? (status.hasKey ? { valid: 'Key saved · Test passed', invalid: 'Key saved · Rejected', untested: 'Key saved · Not tested' }[status.validationStatus] : "No key saved") : error ? "Unavailable" : "Loading…"}
          </span>
        </div>

        <form onSubmit={event => { event.preventDefault(); void changeKey("save"); }} className="space-y-3">
          <label htmlFor="google-byok-key" className="block text-sm text-muted-foreground" dir="ltr">Gemini API key</label>
          <input
            id="google-byok-key"
            type="password"
            value={key}
            onChange={event => { setKey(event.target.value); setMessage(""); setError(""); }}
            placeholder={status?.hasKey ? "Enter a replacement API key" : "AIzaSy…"}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            maxLength={4096}
            disabled={!status?.storageAvailable || busy}
            aria-describedby="byok-storage-note byok-routing-note"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40 disabled:opacity-50"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!status?.storageAvailable || !key.trim() || busy}
              className="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              ކީ ސޭވް ކުރޭ
            </button>
            <button type="button" onClick={() => void changeKey('test')} disabled={!status?.storageAvailable || (!status.hasKey && !key.trim()) || busy}
              className="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
              ކީ ޓެސްޓް ކުރޭ
            </button>
            <button type="button" onClick={() => void changeKey("remove")} disabled={!status?.hasKey || busy}
              className="thaana inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              ކީ ފޮހެލާ
            </button>
          </div>
        </form>

        <fieldset disabled={!status || busy} className="space-y-2">
          <legend className="thaana text-sm text-muted-foreground mb-2">ޗެޓް ކުރުމަށް ބޭނުންކުރާ ޚިދުމަތް</legend>
          <div className="flex flex-wrap gap-2">
            {(['proxy', 'byok'] as const).map(route => (
              <label key={route} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm" dir="ltr">
                <input type="radio" name="model-route" value={route} checked={status?.preferredRoute === route}
                  onChange={() => void selectRoute(route)}
                  disabled={route === 'byok' && (!status?.hasKey || status.validationStatus !== 'valid' || !status.storageAvailable)} />
                {route === 'proxy' ? 'Antigravity proxy' : 'Google AI Studio'}
              </label>
            ))}
          </div>
        </fieldset>

        {message && <p role="status" className="text-xs text-muted-foreground" dir="ltr">{message}</p>}
        {error && <p role="alert" className="text-xs text-destructive" dir="ltr">{error}</p>}
        {status && !status.storageAvailable && <p role="alert" className="text-xs text-destructive" dir="ltr">Secure key storage is unavailable on this device. Saving is disabled.</p>}

        <div className="thaana space-y-2 text-xs text-muted-foreground text-right" dir="rtl" lang="dv">
          <p id="byok-storage-note">ކަލޭގެ ކީ އެންކްރިޕްޓް ކޮށް މި ޑިވައިސްގައި ސޭވް ކުރެވިފައި ވާނެ.</p>
          <p id="byok-routing-note">ގޫގުލް އޭއައި ސްޓޫޑިއޯ ހޮވާފައި އޮތްނަމަ، ޗެޓް ކުރުމަށާއި ޗެޓްގެ ސުރުޚީ ހެދުމަށް ކަލޭގެ ކީ ބޭނުންކުރާނެ. ކީ ރާޅު ސާވަރުގެ މެދުވެރިކަމުން ގޫގުލްއަށް ފޮނުވާނެ.</p>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
            onClick={event => {
              if (window.platform) {
                event.preventDefault();
                void window.platform.openExternal("https://aistudio.google.com/apikey").catch(() => setError("Could not open Google AI Studio. Please open it in your browser."));
              }
            }}
            className="inline-flex items-center gap-1.5 text-foreground underline underline-offset-4 hover:text-primary">
            ގޫގުލް އޭއައި ސްޓޫޑިއޯއިން އޭޕީއައި ކީއެއް ހޯދާ <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
