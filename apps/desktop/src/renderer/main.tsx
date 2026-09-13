import "./global.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeStorage } from "./storage-migration";
import { flushDesktopStorage } from "./storage";

window.platform?.onStorageFlush(flushDesktopStorage);

function StorageGate() {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState('Opening conversations…');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    initializeStorage(setProgress).then(result => {
      setWarnings(result.warnings);
      setReady(true);
    }).catch(error => setError(error instanceof Error ? error.message : String(error)));
  }, [attempt]);
  if (ready && !warnings.length) return <App />;
  return <div className="h-screen flex items-center justify-center bg-background text-foreground p-8">
    <div className="max-w-lg space-y-4">
      <p>{error ? 'Could not open conversation storage' : warnings.length ? 'Some project files need to be added again' : progress}</p>
      {error && <><p className="text-sm text-muted-foreground">{error}</p><p className="text-sm">Your existing history has not been deleted.</p><button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Retry</button></>}
      {warnings.length > 0 && <><ul className="max-h-64 overflow-auto text-sm">{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul><button onClick={() => setWarnings([])}>Continue</button></>}
    </div>
  </div>;
}

const root = createRoot(document.getElementById("root")!);
const isMac = window.platform?.platform === "darwin";
root.render(
  <div className={isMac ? "desktop-macos" : undefined}>
    {isMac && <div className="desktop-window-drag" aria-hidden="true" />}
    <StorageGate />
  </div>
);
