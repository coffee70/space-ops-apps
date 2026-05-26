"use client";

import { Check, Copy, Files, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import { AiEngineerOperationStatusPill } from "@/applications/ai-engineer/components/ai-engineer-operation-status-pill";
import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import { copyTextToClipboard, serializeAiEngineerTranscript } from "@/applications/ai-engineer/lib/transcript";
import type { ChatEvent, ChatMessage, ExecutionMode } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

const modeLabel: Record<ExecutionMode, string> = {
  read_only: "Read only",
  suggest: "Suggest",
  execute: "Execute",
  governed_execute: "Governed execute",
};

export function AiEngineerHeader({
  title,
  executionMode,
  selectedModelName,
  runtimeStatus,
  messages,
  events,
}: {
  title: string;
  executionMode: ExecutionMode;
  selectedModelName?: string | null;
  runtimeStatus?: FrontendRuntimeStatus | null;
  messages?: ChatMessage[];
  events?: ChatEvent[];
}) {
  const [copied, setCopied] = useState<"messages" | "tools" | null>(null);
  const copyTranscript = async (mode: "messages-only" | "include-tools") => {
    await copyTextToClipboard(serializeAiEngineerTranscript(messages ?? [], events ?? [], mode));
    setCopied(mode === "include-tools" ? "tools" : "messages");
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="border-border/40 flex h-12 shrink-0 items-center justify-between border-b px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="bg-muted/60 text-muted-foreground ring-border/50 flex size-7 items-center justify-center rounded-lg ring-1">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="text-muted-foreground hidden text-[11px] sm:block">
            {selectedModelName ? `${selectedModelName} · Platform-native engineering interface` : "Platform-native engineering interface"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="size-8" title="Copy chat" onClick={() => void copyTranscript("messages-only")}>
          {copied === "messages" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span className="sr-only">Copy chat</span>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" title="Copy chat with tool summaries" onClick={() => void copyTranscript("include-tools")}>
          {copied === "tools" ? <Check className="size-3.5" /> : <Files className="size-3.5" />}
          <span className="sr-only">Copy chat with tool summaries</span>
        </Button>
        <AiEngineerOperationStatusPill runtimeStatus={runtimeStatus} />
        <ShieldCheck className="text-muted-foreground hidden size-3.5 sm:block" aria-hidden="true" />
        <AiEngineerStatusPill status={executionMode === "execute" ? "running" : "info"} label={modeLabel[executionMode]} />
      </div>
    </div>
  );
}
