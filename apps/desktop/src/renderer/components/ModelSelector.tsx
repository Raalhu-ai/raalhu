import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { effortLabel, groupModels, modelLabel, preferredOption } from "../model-options";

const MEMORY_KEY = "raalhu_model_efforts";

export function ModelSelector({ models, selectedModel, onModelChange }: {
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}) {
  const groups = useMemo(() => groupModels(models), [models]);
  const selectedGroup = groups.find((group) => group.options.some((option) => option.id === selectedModel));
  const selectedOption = selectedGroup?.options.find((option) => option.id === selectedModel);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"models" | "effort">("models");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const remembered = useRef<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) remembered.current = saved;
    } catch { /* A missing or corrupt preference must not block model selection. */ }
  }, []);

  useEffect(() => {
    if (!selectedGroup || !selectedOption?.effort) return;
    remembered.current[selectedGroup.key] = selectedModel;
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(remembered.current)); } catch {}
  }, [selectedGroup, selectedOption, selectedModel]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const preferred = panel.current?.querySelector<HTMLElement>(view === "effort" ? 'input' : '[aria-pressed="true"]');
    (preferred ?? panel.current?.querySelector<HTMLElement>('button'))?.focus();
  }, [open, view]);

  const showEffort = view === "effort" && selectedGroup && selectedOption?.effort;
  const label = selectedGroup
    ? `${selectedGroup.label}${selectedOption?.effort ? ` · ${effortLabel[selectedOption.effort]}` : ""}`
    : modelLabel(selectedModel);

  return (
    <div ref={container} className="relative thaana" dir="rtl" lang="dv"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open}
        aria-controls={panelId} title={label}
        onClick={() => { setView("models"); setOpen(!open); }}
        className="inline-flex items-center h-8 gap-1.5 px-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <Sparkles className="w-[18px] h-[18px] shrink-0" />
        <span dir="rtl" className="text-xs font-medium">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {open && (
        <div ref={panel} id={panelId} role="dialog" aria-label={showEffort ? "ވިސްނުމުގެ މިންވަރު" : "މޮޑެލް ހޮވާ"}
          className="absolute bottom-full mb-3 start-0 w-80 max-w-[calc(100vw-3rem)] rounded-3xl border border-border bg-popover p-4 shadow-lg z-50">
          {showEffort ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setView("models")} aria-label="މޮޑެލް ބަދަލުކުރޭ"
                  className="p-2 rounded-lg text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary">
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="min-w-0 text-center" dir="rtl">
                  <p className="text-xl font-medium text-primary" aria-live="polite">{effortLabel[selectedOption.effort!]}</p>
                  <button type="button" onClick={() => setView("models")} className="mt-1 text-sm text-muted-foreground hover:text-foreground">
                    {selectedGroup.label}
                  </button>
                </div>
                <button type="button" aria-label="ވިސްނުމުގެ މިންވަރު ޑިފޯލްޓަށް އަނބުރާލާ" title="ވިސްނުމުގެ މިންވަރު ޑިފޯލްޓަށް އަނބުރާލާ"
                  onClick={() => onModelChange(preferredOption(selectedGroup).id)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              {selectedGroup.options.length > 1 ? (
                <div className="mt-6">
                  <input type="range" min={0} max={selectedGroup.options.length - 1} step={1}
                    value={selectedGroup.options.findIndex((option) => option.id === selectedModel)}
                    onChange={(event) => onModelChange(selectedGroup.options[Number(event.target.value)].id)}
                    aria-label={`${selectedGroup.label} ވިސްނުމުގެ މިންވަރު`}
                    aria-valuetext={effortLabel[selectedOption.effort!]}
                    className="model-effort-slider w-full" />
                  <div className="flex justify-between gap-1 mt-3">
                    {selectedGroup.options.map((option) => (
                      <button type="button" key={option.id} onClick={() => onModelChange(option.id)}
                        aria-pressed={selectedModel === option.id} dir="rtl"
                        className={`rounded-md px-1 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary ${selectedModel === option.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                        {effortLabel[option.effort!]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : <p className="mt-5 text-center text-xs text-muted-foreground" dir="rtl">މިހާރު ލިބެން ހުރީ މި މިންވަރު އެކަނި.</p>}
            </>
          ) : (
            <>
              <p className="thaana text-sm text-muted-foreground px-2 mb-3">މޮޑެލް ހޮވާ</p>
              <div className="max-h-[min(22rem,50vh)] overflow-y-auto space-y-1">
                {groups.map((group) => (
                  <button type="button" key={group.key} aria-pressed={selectedGroup?.key === group.key}
                    onClick={() => {
                      const option = preferredOption(group, selectedGroup?.key === group.key ? selectedModel : remembered.current[group.key]);
                      onModelChange(option.id);
                      if (option.effort) setView("effort"); else close();
                    }}
                    className="w-full text-start flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary text-sm text-foreground">
                    <span dir="rtl">{group.label}</span>
                    {selectedGroup?.key === group.key && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
