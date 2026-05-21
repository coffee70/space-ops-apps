"use client";

import { Loader2 } from "lucide-react";

import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import { getAiEngineerOperationStatus } from "@/applications/ai-engineer/lib/operation-status";
import type { ChatEvent } from "@/applications/ai-engineer/types";

export function AiEngineerOperationStatusPill({ events }: { events: ChatEvent[] }) {
  const operation = getAiEngineerOperationStatus(events);
  if (!operation) return null;
  return (
    <span className="inline-flex items-center gap-1" data-testid="ai-engineer-operation-status-pill">
      {operation.status === "running" ? <Loader2 className="text-primary size-3 animate-spin" aria-hidden="true" /> : null}
      <AiEngineerStatusPill status={operation.status} label={operation.label} />
    </span>
  );
}
