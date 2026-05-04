"use client";

import { ArrowUp, Paperclip, Square } from "lucide-react";
import { useRef, useState } from "react";

import { AiEngineerAttachmentPreview } from "@/applications/ai-engineer/components/ai-engineer-attachment-preview";
import type { ExecutionMode } from "@/applications/ai-engineer/types";
import { cn } from "@/lib/utils";

const modes: Array<{ value: ExecutionMode; label: string; title: string }> = [
  { value: "read_only", label: "Read", title: "Inspect only" },
  { value: "suggest", label: "Suggest", title: "Propose changes" },
  { value: "execute", label: "Execute", title: "Run enabled actions" },
];

export function AiEngineerComposer({
  input,
  onInputChange,
  disabled = false,
  executionMode,
  onExecutionModeChange,
  onSend,
  isStreaming = false,
  onStop,
}: {
  input: string;
  onInputChange: (value: string) => void;
  disabled?: boolean;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  onSend: (message: string, files: File[]) => Promise<void>;
  isStreaming?: boolean;
  onStop?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = !disabled && !isSubmitting && !isStreaming && (input.trim().length > 0 || files.length > 0);

  const appendFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setFiles((previous) => [...previous, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft = input.trim();
    if (!draft && files.length === 0) return;

    setIsSubmitting(true);
    const filesToSend = files;
    try {
      await onSend(draft, filesToSend);
      onInputChange("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
      return;
    }

    if (event.key === "Backspace" && input.length === 0 && files.length > 0) {
      event.preventDefault();
      setFiles((previous) => previous.slice(0, -1));
    }
  };

  return (
    <form data-testid="ai-engineer-composer" className="relative flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <div
        className="border-border/30 bg-card/70 overflow-hidden rounded-2xl border shadow-[var(--shadow-composer)] transition-shadow duration-300 focus-within:shadow-[var(--shadow-composer-focus)]"
        onDrop={(event) => {
          event.preventDefault();
          appendFiles(Array.from(event.dataTransfer.files));
        }}
        onDragOver={(event) => event.preventDefault()}
      >
        {files.length > 0 ? (
          <div className="no-scrollbar flex w-full flex-row gap-2 overflow-x-auto px-3 pt-3" data-testid="ai-engineer-attachments-preview">
            {files.map((file, index) => (
              <AiEngineerAttachmentPreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => removeFile(index)} />
            ))}
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          data-testid="ai-engineer-chat-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(event) => appendFiles(Array.from(event.clipboardData.files))}
          placeholder={disabled ? "Preparing session..." : "Ask the AI Engineer to inspect, explain, or modify the platform..."}
          className="placeholder:text-muted-foreground/35 max-h-48 min-h-24 w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-[13px] leading-relaxed outline-none"
          disabled={disabled || isSubmitting || isStreaming}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
          <div className="flex min-w-0 items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.markdown,.txt,.json,.yaml,.yml,.csv,.pdf"
              className="hidden"
              onChange={(event) => appendFiles(Array.from(event.target.files ?? []))}
            />
            <button
              type="button"
              className="border-border/40 text-muted-foreground hover:border-border hover:text-foreground flex h-7 w-7 items-center justify-center rounded-lg border p-1 transition-colors disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSubmitting || isStreaming}
              aria-label="Attach mission or vehicle documents"
            >
              <Paperclip className="size-3.5" />
            </button>
            <div className="border-border/40 bg-background/60 flex items-center rounded-lg border p-0.5" aria-label="Execution mode" role="group">
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  title={mode.title}
                  aria-pressed={executionMode === mode.value}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] transition-colors",
                    executionMode === mode.value ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onExecutionModeChange(mode.value)}
                  disabled={disabled || isSubmitting}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          {isStreaming && onStop ? (
            <button
              type="button"
              aria-label="Stop response"
              onClick={onStop}
              className="bg-foreground text-background flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 hover:opacity-85 active:scale-95"
            >
              <Square className="size-3" />
            </button>
          ) : (
            <button
              type="submit"
              data-testid="ai-engineer-send-button"
              aria-label="Send message"
              disabled={!canSubmit}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200",
                canSubmit ? "bg-foreground text-background hover:opacity-85 active:scale-95" : "cursor-not-allowed bg-muted text-muted-foreground/25",
              )}
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
