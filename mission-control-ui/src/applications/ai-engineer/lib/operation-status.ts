import type { ActivityStatus } from "@/applications/ai-engineer/lib/ui-event-formatting";
import type { ChatEvent } from "@/applications/ai-engineer/types";
import type { ActiveFrontendPreviewRuntimeResponse } from "@/lib/ui-boundary-schemas";

export interface AiEngineerOperationStatus {
  status: ActivityStatus;
  label: string;
}

const DEPLOY_EVENT_TYPES = new Set([
  "deployment.requested",
  "deployment.submitted",
  "deployment.build_started",
  "deployment.health_passed",
  "deployment.failed",
  "deployment.timeout",
  "preview.active",
]);

const PREVIEW_DEPLOY_IN_PROGRESS_TYPES = new Set(["deployment.requested", "deployment.submitted", "deployment.build_started"]);
const BASELINE_REVERT_IN_PROGRESS_TYPES = new Set([
  "revert.requested",
  "baseline.deployment_submitted",
  "baseline.build_started",
]);

function isHealthyPassingPreview(previewRuntime: ActiveFrontendPreviewRuntimeResponse | null | undefined) {
  return (
    previewRuntime?.is_preview === true &&
    previewRuntime.deployment_status === "healthy" &&
    previewRuntime.health_status === "passing"
  );
}

function isHealthyPassingBaseline(previewRuntime: ActiveFrontendPreviewRuntimeResponse | null | undefined) {
  return (
    previewRuntime?.is_preview === false &&
    previewRuntime.deployment_status === "healthy" &&
    previewRuntime.health_status === "passing"
  );
}

function isActivePreview(previewRuntime: ActiveFrontendPreviewRuntimeResponse | null | undefined) {
  return previewRuntime?.is_preview === true;
}

function payloadDeploymentId(event: ChatEvent): string | null {
  const deploymentId = event.payload.deployment_id;
  return typeof deploymentId === "string" && deploymentId.length > 0 ? deploymentId : null;
}

function isMatchingHealthyPassingPreview(event: ChatEvent, previewRuntime: ActiveFrontendPreviewRuntimeResponse | null | undefined) {
  const deploymentId = payloadDeploymentId(event);
  return (
    deploymentId !== null &&
    isHealthyPassingPreview(previewRuntime) &&
    previewRuntime?.active_deployment_id === deploymentId
  );
}

export function getAiEngineerOperationStatus(
  events: ChatEvent[],
  previewRuntime?: ActiveFrontendPreviewRuntimeResponse | null,
): AiEngineerOperationStatus | null {
  const event = [...events]
    .reverse()
    .find(
      (candidate) =>
        DEPLOY_EVENT_TYPES.has(candidate.event_type) ||
        candidate.event_type === "revert.requested" ||
        candidate.event_type === "baseline.deployment_submitted" ||
        candidate.event_type === "baseline.build_started" ||
        candidate.event_type === "baseline.active" ||
        candidate.event_type === "revert.failed",
    );

  if (event) {
    if (event.event_type === "deployment.failed" || event.event_type === "deployment.timeout") {
      if (isMatchingHealthyPassingPreview(event, previewRuntime)) {
        return { status: "success", label: "Preview active" };
      }
      return { status: "failed", label: event.event_type === "deployment.timeout" ? "Preview deploy timed out" : "Preview deploy failed" };
    }
    if (event.event_type === "revert.failed") {
      return { status: "failed", label: "Revert failed" };
    }
    if (event.event_type === "preview.active" || event.event_type === "deployment.health_passed") {
      return { status: "success", label: "Preview active" };
    }
    if (event.event_type === "baseline.active") {
      return { status: "success", label: "Baseline active" };
    }
    if (PREVIEW_DEPLOY_IN_PROGRESS_TYPES.has(event.event_type)) {
      if (isHealthyPassingPreview(previewRuntime)) {
        return { status: "success", label: "Preview active" };
      }
      return { status: "running", label: "Deploying" };
    }
    if (BASELINE_REVERT_IN_PROGRESS_TYPES.has(event.event_type)) {
      if (isHealthyPassingBaseline(previewRuntime)) {
        return { status: "success", label: "Baseline active" };
      }
      return { status: "running", label: "Reverting preview..." };
    }
  }

  if (isHealthyPassingBaseline(previewRuntime)) {
    return { status: "success", label: "Baseline active" };
  }
  if (isHealthyPassingPreview(previewRuntime)) {
    return { status: "success", label: "Preview active" };
  }
  if (isActivePreview(previewRuntime)) {
    return { status: "running", label: "Deploying" };
  }
  return null;
}
