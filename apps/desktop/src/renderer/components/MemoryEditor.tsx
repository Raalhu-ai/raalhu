import React, { useRef, useState } from 'react';

interface MemoryEditorProps {
  label: string;
  description: string;
  descriptionDir?: 'rtl' | 'ltr' | 'auto';
  initialValue: string;
  onSave: (value: string) => Promise<void> | void;
}

export function MemoryEditor({ label, description, descriptionDir = 'auto', initialValue, onSave }: MemoryEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const busy = useRef(false);

  async function save(next: string) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setStatus('');
    try {
      await onSave(next);
      setValue(next);
      setSavedValue(next);
      setStatus('ސޭވްކުރެވިއްޖެ · Saved');
    } catch {
      setStatus('Could not save memory. Please try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <section>
      <label className="thaana block text-sm font-semibold text-foreground">
        {label}
        <textarea
          value={value}
          onChange={event => { setValue(event.target.value); setStatus(''); }}
          disabled={saving}
          dir="auto"
          rows={5}
          className="thaana block w-full mt-3 px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm font-normal resize-y focus:outline-none focus:ring-1 focus:ring-ring/40 disabled:opacity-50"
        />
      </label>
      <p className={`text-xs text-muted-foreground mt-2${descriptionDir === 'rtl' ? ' thaana text-right' : ''}`} dir={descriptionDir}>{description}</p>
      <div className="flex gap-2 mt-3">
        <button type="button" disabled={saving || value === savedValue} onClick={() => save(value)}
          className="thaana px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
          {saving ? 'Saving…' : 'ސޭވް · Save'}
        </button>
        <button type="button" disabled={saving || (!value && !savedValue)} onClick={() => save('')}
          className="thaana px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-50">
          ފޮހެލާ · Clear
        </button>
      </div>
      {status && <p role="status" className="text-xs mt-2" dir="auto">{status}</p>}
    </section>
  );
}
