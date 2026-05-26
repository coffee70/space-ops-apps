"use client";

import { Loader2 } from "lucide-react";

import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import { getAiEngineerOperationStatusFromRuntime } from "@/applications/ai-engineer/lib/operation-status";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

export function AiEngineerOperationStatusPill({
  runtimeStatus,
}: {
  runtimeStatus?: FrontendRuntimeStatus | null;
}) {
  const operation = getAiEngineerOperationStatusFromRuntime(runtimeStatus);
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
