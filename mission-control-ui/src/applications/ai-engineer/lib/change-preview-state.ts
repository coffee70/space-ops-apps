import type {
  AiEngineerChangeSummary,
  ChangePreviewRiskLevel,
  ChangePreviewState,
  ChangePreviewStatus,
  ChangePreviewValidationStatus,
  DeploymentRecord,
} from "@/applications/ai-engineer/lib/change-preview-types";
import type { ChatEvent } from "@/applications/ai-engineer/types";

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function readStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readRiskLevel(payload: Record<string, unknown>): ChangePreviewRiskLevel {
  const value = readString(payload, "risk_level");
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "low";
}

function readValidationStatus(payload: Record<string, unknown>): ChangePreviewValidationStatus {
  const value = readString(payload, "validation_status");
  if (value === "not_run" || value === "running" || value === "passed" || value === "failed") {
    return value;
  }
  return "not_run";
}

export function isChangeSummaryEvent(event: ChatEvent): boolean {
  return event.event_type === "change.summary";
}

export function changeSummaryFromEvent(event: ChatEvent): AiEngineerChangeSummary | null {
  if (!isChangeSummaryEvent(event)) return null;
  const payload = event.payload;
  const branch = readString(payload, "branch");
  if (!branch) return null;
  return {
    conversationId: event.conversation_id,
    agentRunId: event.agent_run_id,
    branch,
    baseBranch: readString(payload, "base_branch") ?? "main",
    baseCommitSha: readString(payload, "base_commit_sha") ?? null,
    commitSha: readString(payload, "commit_sha") ?? null,
    changedFiles: readStringArray(payload, "changed_files"),
    targetUnitId: readString(payload, "target_unit_id") ?? null,
    targetApplicationId: readString(payload, "target_application_id") ?? null,
    affectedCapability: readString(payload, "affected_capability") ?? "platform-change",
    riskLevel: readRiskLevel(payload),
    validationStatus: readValidationStatus(payload),
  };
}

export function createInitialChangePreviewState(change: AiEngineerChangeSummary): ChangePreviewState {
  return {
    status: "ready_to_deploy",
    change,
  };
}

export function startDeploying(state: ChangePreviewState): ChangePreviewState {
  return { ...state, status: "deploying", failureReason: undefined };
}

export function applyDeploySubmitted(state: ChangePreviewState, deployment: DeploymentRecord): ChangePreviewState {
  return {
    ...state,
    status: deployment.status === "failed" ? "failed" : "deploying",
    previewDeploymentId: deployment.deployment_id,
    previewDeployment: deployment,
    failureReason: deployment.status === "failed" ? deployment.failure_reason ?? undefined : undefined,
  };
}

export function applyDeployUpdate(state: ChangePreviewState, deployment: DeploymentRecord): ChangePreviewState {
  if (state.previewDeploymentId && deployment.deployment_id !== state.previewDeploymentId) {
    return state;
  }
  if (deployment.status === "healthy") {
    return {
      ...state,
      status: "deployed_preview",
      previewDeployment: deployment,
      previewDeploymentId: deployment.deployment_id,
      failureReason: undefined,
    };
  }
  if (deployment.status === "failed") {
    return {
      ...state,
      status: "failed",
      previewDeployment: deployment,
      previewDeploymentId: deployment.deployment_id,
      failureReason: deployment.failure_reason ?? "Deployment failed.",
    };
  }
  if (deployment.status === "replaced") {
    // The deployment was superseded before it was promoted to active.
    // Treat as failed (with a friendlier reason) so the UI never gets stuck
    // in a deploying spinner waiting for healthy.
    return {
      ...state,
      status: "failed",
      previewDeployment: deployment,
      previewDeploymentId: deployment.deployment_id,
      failureReason:
        deployment.failure_reason ?? "Preview deployment was replaced before it became active.",
    };
  }
  return {
    ...state,
    previewDeployment: deployment,
    previewDeploymentId: deployment.deployment_id,
  };
}

export function startReverting(state: ChangePreviewState): ChangePreviewState {
  return { ...state, status: "reverting", failureReason: undefined };
}

export function applyRevertSubmitted(state: ChangePreviewState, deployment: DeploymentRecord): ChangePreviewState {
  return {
    ...state,
    status: deployment.status === "failed" ? "failed" : "reverting",
    revertDeploymentId: deployment.deployment_id,
    revertDeployment: deployment,
    failureReason: deployment.status === "failed" ? deployment.failure_reason ?? undefined : undefined,
  };
}

export function applyRevertUpdate(state: ChangePreviewState, deployment: DeploymentRecord): ChangePreviewState {
  if (state.revertDeploymentId && deployment.deployment_id !== state.revertDeploymentId) {
    return state;
  }
  if (deployment.status === "healthy") {
    return {
      ...state,
      status: "baseline_restored",
      revertDeployment: deployment,
      revertDeploymentId: deployment.deployment_id,
      failureReason: undefined,
    };
  }
  if (deployment.status === "failed") {
    return {
      ...state,
      status: "failed",
      revertDeployment: deployment,
      revertDeploymentId: deployment.deployment_id,
      failureReason: deployment.failure_reason ?? "Revert failed.",
    };
  }
  if (deployment.status === "replaced") {
    // Baseline restoration was superseded before the runtime was activated.
    // We can't claim the baseline is healthy without explicit confirmation,
    // so surface this as a failed revert with friendly copy.
    return {
      ...state,
      status: "failed",
      revertDeployment: deployment,
      revertDeploymentId: deployment.deployment_id,
      failureReason:
        deployment.failure_reason ?? "Baseline deployment was replaced before it became active.",
    };
  }
  return {
    ...state,
    revertDeployment: deployment,
    revertDeploymentId: deployment.deployment_id,
  };
}

export function failPreview(state: ChangePreviewState, reason: string): ChangePreviewState {
  return { ...state, status: "failed", failureReason: reason };
}

export function isTerminalChangePreviewStatus(status: ChangePreviewStatus): boolean {
  return status === "deployed_preview" || status === "baseline_restored" || status === "failed";
}
