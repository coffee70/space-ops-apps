"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  revertPreviewChange,
  type RevertPreviewChangeInput,
} from "@/applications/ai-engineer/lib/change-preview-client";
import { fetchFrontendRuntimeStatus, useFrontendRuntimeStatusQuery } from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

type RevertState = "idle" | "reverting" | "failed";

export function buildPreviewRuntimeRevertInput(
  preview: FrontendRuntimeStatus,
): RevertPreviewChangeInput | null {
  if (!preview.frontend_unit_id) {
    return null;
  }
  const active = preview.active;
  return {
    targetUnitId: preview.frontend_unit_id,
    targetApplicationId: preview.target_application_id ?? null,
    baselineBranch: preview.baseline_branch ?? "main",
    baselineCommitSha: preview.baseline_commit_sha ?? null,
    previewDeploymentId: active?.is_preview ? active.deployment_id ?? null : null,
    conversationId: null,
    agentRunId: null,
  };
}

async function waitForRuntimeRevertResult(): Promise<FrontendRuntimeStatus> {
  const startedAt = Date.now();
  while (true) {
    const status = await fetchFrontendRuntimeStatus();
    if (status.effective_state === "baseline_active" || status.effective_state === "baseline_revert_failed") {
      return status;
    }
    if (Date.now() - startedAt > 120_000) {
      throw new Error("Revert did not complete. The preview runtime may still be active.");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

function shortCommit(commitSha?: string | null) {
  return commitSha ? commitSha.slice(0, 7) : null;
}

function previewValidationCopy(active: NonNullable<FrontendRuntimeStatus["active"]>) {
  const validationStatus = active.validation_status ?? "not_run";
  const healthPassing = active.deployment_status === "healthy" && active.health_status === "passing";
  if (validationStatus === "passed" && active.success_claim_allowed) {
    return {
      label: "Preview validated",
      message: "Runtime health and platform integration checks passed.",
    };
  }
  if (validationStatus === "failed") {
    return {
      label: "Preview validation failed",
      message:
        active.last_validation_message ||
        "The runtime is healthy, but at least one platform integration check failed.",
    };
  }
  if (validationStatus === "not_ready") {
    return {
      label: "Preview not ready for validation",
      message: "Deployment has not reached healthy/passing state yet.",
    };
  }
  if (validationStatus === "running") {
    return {
      label: "Preview validation running",
      message: "Runtime health is passing and platform integration checks are in progress.",
    };
  }
  if (validationStatus === "partially_validated") {
    return {
      label: "Preview partially validated",
      message: "Some platform integration checks passed, but validation has not fully completed.",
    };
  }
  if (healthPassing) {
    return {
      label: "Preview healthy - validation not run",
      message: "Runtime health is passing, but capability validation has not completed.",
    };
  }
  return {
    label: "Preview deployed",
    message: "The preview runtime is deployed, but runtime health and capability validation are not both complete.",
  };
}

export function PreviewRuntimeBannerView({
  preview,
  revertState,
  errorMessage,
  onRevert,
}: {
  preview: FrontendRuntimeStatus;
  revertState: RevertState;
  errorMessage?: string | null;
  onRevert: () => void;
}) {
  const active = preview.active;
  const shouldShow =
    preview.effective_state === "preview_active" ||
    preview.effective_state === "baseline_reverting" ||
    (preview.effective_state === "baseline_revert_failed" && active?.is_preview);
  if (!shouldShow || !active?.is_preview) {
    return null;
  }

  const commit = shortCommit(active.commit_sha);
  const branch = active.branch ?? "unknown preview branch";
  const isReverting = revertState === "reverting" || preview.effective_state === "baseline_reverting";
  const isFailed = revertState === "failed" || preview.effective_state === "baseline_revert_failed";
  const validationCopy = previewValidationCopy(active);

  return (
    <section
      aria-label="Preview frontend runtime"
      data-testid="preview-runtime-banner"
      className="shrink-0 border-b border-amber-300/40 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-400/30 dark:bg-amber-950/50 dark:text-amber-50"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{validationCopy.label}</span>
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs dark:bg-amber-900/70">{branch}</code>
            {commit ? (
              <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs dark:bg-amber-900/70">{commit}</code>
            ) : null}
          </div>
          <p className="text-sm leading-5 text-amber-900 dark:text-amber-100">
            Preview deployed from {branch}
            {commit ? ` @ ${commit}` : ""}. {validationCopy.message}
          </p>
          {preview.target_application_id ? (
            <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
              Intended inspection target: <span className="font-medium">{preview.target_application_id}</span>
            </p>
          ) : null}
          {isFailed ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertTriangle aria-hidden="true" className="size-3.5" />
              {errorMessage || "Revert did not complete. The preview runtime may still be active."}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          data-testid="preview-runtime-revert-button"
          onClick={onRevert}
          disabled={isReverting}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-amber-500/50 bg-white px-3 text-sm font-medium text-amber-950 shadow-xs transition-colors hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 dark:bg-amber-950 dark:text-amber-50 dark:hover:bg-amber-900"
        >
          {isReverting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <RotateCcw aria-hidden="true" className="size-4" />
          )}
          {isReverting ? "Reverting..." : "Revert to baseline"}
        </button>
      </div>
    </section>
  );
}

export function PreviewRuntimeBanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const previewQuery = useFrontendRuntimeStatusQuery();
  const [revertState, setRevertState] = useState<RevertState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const preview = previewQuery.data;
  if (!preview) {
    return null;
  }

  const handleRevert = async () => {
    const input = buildPreviewRuntimeRevertInput(preview);
    if (!input) {
      setRevertState("failed");
      setErrorMessage("Revert cannot start because the frontend runtime unit is unknown.");
      return;
    }

    setRevertState("reverting");
    setErrorMessage(null);
    try {
      await revertPreviewChange(input);
      await queryClient.invalidateQueries({ queryKey: queryKeys.frontendRuntimeStatus });
      const runtime = await waitForRuntimeRevertResult();
      queryClient.setQueryData(queryKeys.frontendRuntimeStatus, runtime);
      if (runtime.effective_state !== "baseline_active") {
        throw new Error("Revert did not complete. The preview runtime may still be active.");
      }
      router.refresh();
      window.location.reload();
    } catch (error) {
      setRevertState("failed");
      setErrorMessage(error instanceof Error ? error.message : "Revert did not complete. The preview runtime may still be active.");
    }
  };

  return (
    <PreviewRuntimeBannerView
      preview={preview}
      revertState={revertState}
      errorMessage={errorMessage}
      onRevert={handleRevert}
    />
  );
}
