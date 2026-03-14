import React, { useState, useRef, useEffect, useCallback } from "react";
import { modelDisplayName } from "@raalhu/shared";
import {
  Plus, ArrowUp, Sparkles, Check, Paperclip, Camera,
  Feather, Globe, X, FileText, Archive, ChevronRight, Loader2,
} from "lucide-react";

/* ── Types ── */

export interface AttachedFile {
  id: string;
  file: File;
  type: "image" | "document";
  preview: string;
  uploadStatus: "uploading" | "done" | "error";
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: number;
}

export type StyleId = "normal" | "learning" | "concise" | "explanatory" | "formal";

export interface ChatInputSendData {
  message: string;
  files: AttachedFile[];
  pastedContent: PastedContent[];
  webSearchEnabled: boolean;
  style: StyleId;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  placeholder?: string;
  onSend: (data: ChatInputSendData) => void;
  disabled?: boolean;
  autofocus?: boolean;
}

/* ── Style options ── */

const STYLE_OPTIONS: { id: StyleId; label: string }[] = [
  { id: "normal", label: "ޢާންމު" },
  { id: "learning", label: "ދަސްކުރުން" },
  { id: "concise", label: "ކުރު" },
  { id: "explanatory", label: "ތަފްސީލީ" },
  { id: "formal", label: "ރަސްމީ" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

export default function ChatInput({
  value,
  onChange,
  selectedModel,
  onModelChange,
  models,
  placeholder = "މެސެޖެއް ލިޔުއްވާ...",
  onSend,
  disabled = false,
  autofocus = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [activeStyle, setActiveStyle] = useState<StyleId>("normal");

  const hasContent = value.trim().length > 0 || files.length > 0 || pastedContent.length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 384) + "px";
    }
  }, [value]);

  // Autofocus
  useEffect(() => {
    if (autofocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autofocus]);

  // Close menus on outside click
  useEffect(() => {
    if (!modelMenuOpen && !plusMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (modelMenuOpen && modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
      if (plusMenuOpen && plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setPlusMenuOpen(false);
        setStyleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modelMenuOpen, plusMenuOpen]);

  // File handling
  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    const newFiles: AttachedFile[] = arr.map((file) => {
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? URL.createObjectURL(file) : "";
      return {
        id: crypto.randomUUID(),
        file,
        type: isImage ? "image" : "document",
        preview,
        uploadStatus: "uploading" as const,
      };
    });
    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload completion
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          newFiles.some((nf) => nf.id === f.id)
            ? { ...f, uploadStatus: "done" as const }
            : f
        )
      );
    }, 600);
  }, []);

  function removeFile(id: string) {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }

  function removePastedContent(id: string) {
    setPastedContent((prev) => prev.filter((p) => p.id !== id));
  }

  async function takeScreenshot() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const canvas = document.createElement("canvas");
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      track.stop();
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });
      handleFiles([file]);
    } catch {
      // User cancelled or permission denied
    }
    setPlusMenuOpen(false);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const fileItems: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const f = items[i].getAsFile();
        if (f) fileItems.push(f);
      }
    }
    if (fileItems.length > 0) {
      e.preventDefault();
      handleFiles(fileItems);
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    if (text && text.length > 300) {
      e.preventDefault();
      setPastedContent((prev) => [
        ...prev,
        { id: crypto.randomUUID(), content: text, timestamp: Date.now() },
      ]);
    }
  }

  // Drag handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleSend() {
    if (!hasContent || disabled) return;
    onSend({
      message: value,
      files,
      pastedContent,
      webSearchEnabled,
      style: activeStyle,
    });
    setFiles([]);
    setPastedContent([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="relative w-full">
      {/* Main container */}
      <div
        className={`flex flex-col rounded-2xl border bg-card
          shadow-sm hover:shadow-md focus-within:shadow-md
          focus-within:border-ring/50
          transition-all duration-200
          ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col px-3 pt-3 pb-3 gap-2">
          {/* Attachments row */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div className="flex gap-2 overflow-x-auto pb-1" dir="rtl">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="relative shrink-0 w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden group"
                >
                  {f.type === "image" && f.preview ? (
                    <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full px-1 gap-1">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground font-mono truncate max-w-full">
                        {getFileExtension(f.file.name)}
                      </span>
                      <span className="text-[8px] text-muted-foreground truncate max-w-full px-1">
                        {f.file.name}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {formatFileSize(f.file.size)}
                      </span>
                    </div>
                  )}
                  {/* Upload overlay */}
                  {f.uploadStatus === "uploading" && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(f.id)}
                    className="absolute top-0.5 end-0.5 p-0.5 rounded-full bg-background/80 text-muted-foreground
                      hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {pastedContent.map((p) => (
                <div
                  key={p.id}
                  className="relative shrink-0 w-28 h-24 rounded-lg border border-border bg-muted overflow-hidden group"
                >
                  <div className="flex flex-col h-full px-2 py-1.5 gap-0.5">
                    <div className="flex items-center gap-1">
                      <Archive className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="thaana text-[9px] text-muted-foreground">ޕޭސްޓް</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight line-clamp-4 overflow-hidden" dir="auto">
                      {p.content.slice(0, 200)}
                    </p>
                  </div>
                  <button
                    onClick={() => removePastedContent(p.id)}
                    className="absolute top-0.5 end-0.5 p-0.5 rounded-full bg-background/80 text-muted-foreground
                      hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea area */}
          <div className="relative min-h-[2.5rem]">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              dir="rtl"
              rows={1}
              style={{ minHeight: "2.5rem", maxHeight: "384px" }}
              className="thaana w-full bg-transparent text-foreground text-[18px]
                placeholder:text-muted-foreground resize-none overflow-hidden
                focus:outline-none leading-relaxed px-1 py-1"
              disabled={disabled}
              autoFocus={autofocus}
            />
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-1">
            {/* Plus button with dropdown */}
            <div className="relative" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(!plusMenuOpen);
                  setStyleMenuOpen(false);
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg
                  text-muted-foreground hover:text-foreground hover:bg-accent
                  transition-colors duration-200 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>

              {plusMenuOpen && (
                <div className="absolute bottom-full mb-1 start-0 w-52 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in-down">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setPlusMenuOpen(false);
                    }}
                    className="thaana w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span>ފައިލް ނުވަތަ ފޮޓޯ</span>
                  </button>
                  <button
                    type="button"
                    onClick={takeScreenshot}
                    className="thaana w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span>ސްކްރީންޝޮޓް ނަގާ</span>
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    type="button"
                    onClick={() => setStyleMenuOpen(!styleMenuOpen)}
                    className="thaana w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Feather className="w-4 h-4 text-muted-foreground" />
                    <span>ސްޓައިލް</span>
                    <ChevronRight className="w-3 h-3 ms-auto text-muted-foreground" />
                  </button>

                  {/* Style submenu */}
                  {styleMenuOpen && (
                    <div className="absolute start-full top-0 ms-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in-down">
                      {STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setActiveStyle(opt.id);
                            setStyleMenuOpen(false);
                            setPlusMenuOpen(false);
                          }}
                          className={`thaana w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors
                            ${activeStyle === opt.id ? "text-foreground font-medium" : "text-muted-foreground"}`}
                        >
                          <span>{opt.label}</span>
                          {activeStyle === opt.id && (
                            <Check className="w-3.5 h-3.5 ms-auto text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model switcher */}
            {models.length > 0 && (
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setModelMenuOpen(!modelMenuOpen)}
                  className="inline-flex items-center justify-center h-8 gap-1.5 px-2 rounded-lg
                    text-muted-foreground hover:text-foreground hover:bg-accent
                    transition-colors duration-200 active:scale-95"
                >
                  <Sparkles className="w-[18px] h-[18px]" />
                  <span className="thaana text-[11px] font-medium max-w-[120px] truncate">
                    {modelDisplayName(selectedModel)}
                  </span>
                </button>

                {/* Model dropdown */}
                {modelMenuOpen && (
                  <div
                    className="absolute bottom-full mb-1 start-0 w-56 bg-popover border border-border
                      rounded-lg shadow-lg py-1 z-50 animate-fade-in-down"
                  >
                    {models.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          onModelChange(model);
                          setModelMenuOpen(false);
                        }}
                        className={`thaana w-full flex items-center gap-3 px-3 py-2 text-sm
                          hover:bg-accent transition-colors
                          ${selectedModel === model ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        <span>{modelDisplayName(model)}</span>
                        {selectedModel === model && (
                          <Check className="w-3.5 h-3.5 ms-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Web search toggle */}
            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg
                transition-colors duration-200 active:scale-95
                ${webSearchEnabled
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              title="ވެބް ސާރޗް"
            >
              <Globe className="w-[18px] h-[18px]" />
            </button>

            <div className="flex-1" />

            {/* Active modifier pills */}
            {webSearchEnabled && (
              <span className="thaana text-[10px] text-primary bg-primary/10 rounded-full border border-primary/20 px-2 py-0.5">
                ވެބް
              </span>
            )}
            {activeStyle !== "normal" && (
              <span className="thaana text-[10px] text-primary bg-primary/10 rounded-full border border-primary/20 px-2 py-0.5">
                {STYLE_OPTIONS.find((s) => s.id === activeStyle)?.label}
              </span>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              type="button"
              disabled={!hasContent || disabled}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-xl
                transition-colors duration-200 active:scale-95
                ${
                  hasContent
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "text-muted-foreground opacity-50 cursor-default"
                }`}
              aria-label="ފޮނުވާ"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center z-10 pointer-events-none">
          <span className="thaana text-primary text-sm">ފައިލް ދޫކޮށްލާ</span>
        </div>
      )}
    </div>
  );
}
