"use client";

import { Check, MoreHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";

import { AiEngineerOperationStatusPill } from "@/applications/ai-engineer/components/ai-engineer-operation-status-pill";
import { copyTextToClipboard, serializeAiEngineerTranscript } from "@/applications/ai-engineer/lib/transcript";
import type { TranscriptMode } from "@/applications/ai-engineer/lib/transcript";
import type { ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

export function AiEngineerHeader({
  title,
  selectedModelName,
  runtimeStatus,
  messages,
  events,
}: {
  title: string;
  selectedModelName?: string | null;
  runtimeStatus?: FrontendRuntimeStatus | null;
  messages?: ChatMessage[];
  events?: ChatEvent[];
}) {
  const [copied, setCopied] = useState<"messages" | "tools" | "debug" | null>(null);
  const copyTranscript = async (mode: TranscriptMode) => {
    await copyTextToClipboard(serializeAiEngineerTranscript(messages ?? [], events ?? [], mode));
    setCopied(mode === "debug-trace" ? "debug" : mode === "include-tools" ? "tools" : "messages");
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
        <AiEngineerOperationStatusPill runtimeStatus={runtimeStatus} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              title="Chat actions"
              aria-label="Chat actions"
            >
              {copied ? <Check className="size-3.5" /> : <MoreHorizontal className="size-3.5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onSelect={() => void copyTranscript("messages-only")}>
              {copied === "messages" ? "Copied chat" : "Copy chat"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copyTranscript("include-tools")}>
              {copied === "tools" ? "Copied chat with tool summaries" : "Copy chat with tool summaries"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copyTranscript("debug-trace")}>
              {copied === "debug" ? "Copied debug trace" : "Copy debug trace"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
