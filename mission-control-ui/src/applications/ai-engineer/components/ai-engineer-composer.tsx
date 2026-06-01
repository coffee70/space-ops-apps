"use client";

import { ArrowUp, Square } from "lucide-react";
import { useRef, useState } from "react";

import { AiEngineerModelBudgetMeter } from "@/applications/ai-engineer/components/ai-engineer-model-budget-meter";
import { AiEngineerModelPicker } from "@/applications/ai-engineer/components/model-picker/ai-engineer-model-picker";
import type { AiEngineerModelOption, ExecutionMode, ModelBudgetSnapshot } from "@/applications/ai-engineer/types";
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
  models = [],
  selectedModelId = null,
  onModelSelect,
  isLoadingModels = false,
  modelLoadError = null,
  modelBudgetSnapshot = null,
}: {
  input: string;
  onInputChange: (value: string) => void;
  disabled?: boolean;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  onSend: (message: string) => Promise<void>;
  isStreaming?: boolean;
  onStop?: () => void;
  models?: AiEngineerModelOption[];
  selectedModelId?: string | null;
  onModelSelect?: (modelId: string) => void;
  isLoadingModels?: boolean;
  modelLoadError?: string | null;
  modelBudgetSnapshot?: ModelBudgetSnapshot | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = !disabled && !isSubmitting && !isStreaming && input.trim().length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft = input.trim();
    if (!draft) return;

    setIsSubmitting(true);
    onInputChange("");
    void Promise.resolve(onSend(draft)).finally(() => setIsSubmitting(false));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
      return;
    }
  };

  return (
    <form data-testid="ai-engineer-composer" className="relative flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <div className="border-border/30 bg-card/70 overflow-hidden rounded-2xl border shadow-[var(--shadow-composer)] transition-shadow duration-300 focus-within:shadow-[var(--shadow-composer-focus)]">
        <textarea
          ref={textareaRef}
          data-testid="ai-engineer-chat-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Preparing session..." : "Ask the AI Engineer to inspect, explain, or modify the platform..."}
          className="placeholder:text-muted-foreground/35 max-h-48 min-h-24 w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-[13px] leading-relaxed outline-none"
          disabled={disabled || isSubmitting || isStreaming}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
          <div className="flex min-w-0 items-center gap-1">
            <AiEngineerModelPicker
              models={models}
              selectedModelId={selectedModelId}
              onSelect={(id) => onModelSelect?.(id)}
              disabled={disabled || isSubmitting || isStreaming}
              isLoading={isLoadingModels}
              loadError={modelLoadError}
            />
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
          <div className="ml-auto flex items-center gap-2">
            <AiEngineerModelBudgetMeter snapshot={modelBudgetSnapshot} isStreaming={isStreaming} />
            {isStreaming && onStop ? (
              <button
                type="button"
                aria-label="Stop response"
                onClick={onStop}
                className="bg-foreground text-background flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 hover:opacity-85 active:scale-95"
              >
                <Square className="size-3" fill="currentColor" strokeWidth={0} />
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
      </div>
    </form>
  );
}
