import React, { useEffect, useState } from 'react';
import { storage } from '../storage';
import type { GlobalMemoryState } from '../../storage/types';

export function GlobalMemory() {
  const [memory, setMemory] = useState<GlobalMemoryState | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    const refresh = () => { void storage().getGlobalMemory().then(value => {
      if (mounted) { setMemory(value); setError(false); }
    }).catch(() => { if (mounted) setError(true); }); };
    refresh();
    window.addEventListener('global-memory-updated', refresh);
    return () => { mounted = false; window.removeEventListener('global-memory-updated', refresh); };
  }, []);
  return (
    <section dir="rtl">
      <h2 className="thaana-heading text-xl mb-2">އާންމު ހަނދާންތައް</h2>
      <p className="thaana text-sm text-muted-foreground text-right mb-4">
        ރާޅުން ފަހުގެ ޗެޓްތަކުން މި ހަނދާންތައް އަޕްޑޭޓްކުރާނެއެވެ. ހުރިހާ ޗެޓެއްގައި މި މައުލޫމާތު ބޭނުންކުރެވޭނެއެވެ.
      </p>
      {error ? <p role="alert">Could not load memory. Reopen Settings to retry.</p> : memory ? (
        <>
          <div className="rounded-lg border border-border bg-background p-3 space-y-3">
            {memory.content.split('\n\n').map((paragraph, index) => <p key={index} dir="auto" className="thaana text-sm">{paragraph}</p>)}
          </div>
          <p className="text-xs text-muted-foreground mt-2" dir="auto">
            {memory.entries.length ? `Last updated: ${new Date(memory.entries[0].createdAt).toLocaleString()}` : 'Memory will appear automatically after completed chats.'}
          </p>
        </>
      ) : <p role="status">ލޯޑުވަނީ…</p>}
    </section>
  );
}
