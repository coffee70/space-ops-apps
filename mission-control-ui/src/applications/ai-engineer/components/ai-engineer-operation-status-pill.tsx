"use client";

import { Loader2 } from "lucide-react";

import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import { getAiEngineerOperationStatus } from "@/applications/ai-engineer/lib/operation-status";
import type { ChatEvent } from "@/applications/ai-engineer/types";
import type { ActiveFrontendPreviewRuntimeResponse } from "@/lib/ui-boundary-schemas";

export function AiEngineerOperationStatusPill({
  events,
  previewRuntime,
}: {
  events: ChatEvent[];
  previewRuntime?: ActiveFrontendPreviewRuntimeResponse | null;
}) {
  const operation = getAiEngineerOperationStatus(events, previewRuntime);
  if (!operation) return null;
  return (
    <span className="inline-flex items-center gap-1" data-testid="ai-engineer-operation-status-pill">
      <AiEngineerStatusPill
        status={operation.status}
        label={operation.label}
        leftIcon={
          operation.status === "running" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" data-testid="ai-engineer-operation-status-spinner" />
          ) : undefined
        }
      />
    </span>
  );
}
