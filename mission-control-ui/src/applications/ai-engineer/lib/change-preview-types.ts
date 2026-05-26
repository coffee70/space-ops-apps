/**
 * Frontend models for the chat-native change preview / deploy / revert flow.
 *
 * The shapes mirror the kernel control-plane schemas (see
 * `space-ops-kernel/control-plane/app/schemas.py`) so the UI never has to
 * parse free-form text to learn about a change, deployment, or revert.
 */

export type ChangePreviewStatus =
  | "idle"
  | "change_detected"
  | "ready_to_deploy"
  | "deploying"
  | "deployed_preview"
  | "reverting"
  | "baseline_restored"
  | "failed";

export type ChangePreviewRiskLevel = "low" | "medium" | "high";
export type ChangePreviewValidationStatus = "not_run" | "running" | "passed" | "failed";

export interface AiEngineerChangeSummary {
  conversationId: string | null;
  agentRunId: string;
  branch: string;
  baseBranch: string;
  baseCommitSha?: string | null;
  commitSha?: string | null;
  changedFiles: string[];
  targetUnitId?: string | null;
  targetApplicationId?: string | null;
  affectedCapability: string;
  riskLevel: ChangePreviewRiskLevel;
  validationStatus: ChangePreviewValidationStatus;
}

export interface DeploymentRecord {
  deployment_id: string;
  unit_id: string;
  branch: string;
  commit_sha: string;
  deployment_intent?: string;
  status: string;
  health_status: string;
  logs_url?: string;
  registered?: boolean;
  failure_reason?: string | null;
}

export interface ChangePreviewState {
  status: ChangePreviewStatus;
  change: AiEngineerChangeSummary;
  previewDeploymentId?: string;
  previewDeployment?: DeploymentRecord;
  revertDeploymentId?: string;
  revertDeployment?: DeploymentRecord;
  failureReason?: string;
}
