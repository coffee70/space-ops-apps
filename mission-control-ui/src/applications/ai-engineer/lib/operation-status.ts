import type { ActivityStatus } from "@/applications/ai-engineer/lib/ui-event-formatting";
import type { ChatEvent } from "@/applications/ai-engineer/types";

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

export function getAiEngineerOperationStatus(events: ChatEvent[]): AiEngineerOperationStatus | null {
  const event = [...events].reverse().find((candidate) => DEPLOY_EVENT_TYPES.has(candidate.event_type) || candidate.event_type === "revert.requested" || candidate.event_type === "baseline.active" || candidate.event_type === "revert.failed");
  if (!event) return null;
  if (event.event_type === "deployment.failed" || event.event_type === "deployment.timeout" || event.event_type === "revert.failed") {
    return { status: "failed", label: event.event_type === "deployment.timeout" ? "Preview deploy timed out" : "Preview deploy failed" };
  }
  if (event.event_type === "preview.active" || event.event_type === "deployment.health_passed") {
    return { status: "success", label: "Preview active" };
  }
  if (event.event_type === "baseline.active") {
    return { status: "success", label: "Baseline active" };
  }
  if (event.event_type === "revert.requested") {
    return { status: "running", label: "Reverting preview..." };
  }
  return { status: "running", label: "Deploying preview..." };
}
