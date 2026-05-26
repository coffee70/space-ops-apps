import type { ActivityStatus } from "@/applications/ai-engineer/lib/ui-event-formatting";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

export interface AiEngineerOperationStatus {
  status: ActivityStatus;
  label: string;
}

export function getAiEngineerOperationStatusFromRuntime(
  runtimeStatus?: FrontendRuntimeStatus | null,
): AiEngineerOperationStatus | null {
  switch (runtimeStatus?.effective_state) {
    case "preview_deploying":
      return { status: "running", label: "Deploying" };
    case "preview_active":
      return { status: "success", label: "Preview active" };
    case "baseline_reverting":
      return { status: "running", label: "Reverting preview..." };
    case "baseline_active":
      return { status: "success", label: "Baseline active" };
    case "preview_deploy_failed":
      return { status: "failed", label: "Preview deploy failed" };
    case "baseline_revert_failed":
      return { status: "failed", label: "Revert failed" };
    case "unknown":
    default:
      return null;
  }
}
