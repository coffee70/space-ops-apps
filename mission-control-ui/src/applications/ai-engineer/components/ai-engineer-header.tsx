"use client";

import { ShieldCheck, Sparkles } from "lucide-react";

import { AiEngineerOperationStatusPill } from "@/applications/ai-engineer/components/ai-engineer-operation-status-pill";
import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import type { ChatEvent, ExecutionMode } from "@/applications/ai-engineer/types";

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
  events,
}: {
  title: string;
  executionMode: ExecutionMode;
  selectedModelName?: string | null;
  events: ChatEvent[];
}) {
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
        <AiEngineerOperationStatusPill events={events} />
        <ShieldCheck className="text-muted-foreground hidden size-3.5 sm:block" aria-hidden="true" />
        <AiEngineerStatusPill status={executionMode === "execute" ? "running" : "info"} label={modeLabel[executionMode]} />
      </div>
    </div>
  );
}
