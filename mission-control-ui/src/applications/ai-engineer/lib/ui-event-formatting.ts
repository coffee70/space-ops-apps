import type { AttachmentStatus, ChatEvent } from "@/applications/ai-engineer/types";
import {
  ModelProviderErrorPayloadSchema,
  ModelRetryingPayloadSchema,
  ModelRetryScheduledPayloadSchema,
} from "@/applications/ai-engineer/schemas";

export type ActivityStatus = "pending" | "running" | "success" | "failed" | "info";
export type EventIconKind = "run" | "context" | "tool" | "document" | "code" | "navigation" | "message" | "deployment" | "error";

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" ? value : undefined;
}

function humanizeEventType(eventType: string) {
  return eventType
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getEventDisplayTitle(event: ChatEvent): string {
  const titles: Record<string, string> = {
    "run.started": "Run started",
    "run.completed": "Run completed",
    "run.failed": "Run failed",
    "context.requested": "Resolving context",
    "context.resolved": "Context resolved",
    "context.failed": "Context failed",
    "tool.started": "Tool started",
    "tool.completed": "Tool completed",
    "tool.failed": "Tool failed",
    "document.uploaded": "Document uploaded",
    "document.ingestion_started": "Ingesting document",
    "document.ingestion_completed": "Document ready",
    "document.ingestion_failed": "Document ingestion failed",
    "code.index_started": "Indexing code",
    "code.index_completed": "Code index complete",
    "code.index_failed": "Code index failed",
    "navigation.requested": "Navigation requested",
    "message.completed": "Message completed",
    "model.provider_error": "Model provider issue",
    "model.retry_scheduled": "Retry scheduled",
    "model.retrying": "Retrying model request",
    "change.summary": "Change preview ready",
    "deployment.requested": "Deploying preview",
    "deployment.submitted": "Deployment submitted",
    "deployment.build_started": "Building preview",
    "deployment.build_finished": "Preview built",
    "deployment.health_passed": "Preview healthy",
    "deployment.failed": "Deployment failed",
    "preview.active": "Preview is live",
    "revert.requested": "Reverting preview",
    "baseline.deployment_submitted": "Restoring baseline",
    "baseline.build_started": "Building baseline",
    "baseline.active": "Baseline restored",
    "revert.failed": "Revert failed",
    error: "Error",
  };

  return titles[event.event_type] ?? humanizeEventType(event.event_type);
}

const DEPLOYMENT_LIFECYCLE_TYPES = new Set([
  "deployment.requested",
  "deployment.submitted",
  "deployment.build_started",
  "deployment.build_finished",
  "deployment.health_passed",
  "deployment.failed",
  "preview.active",
  "revert.requested",
  "baseline.deployment_submitted",
  "baseline.build_started",
  "baseline.active",
  "revert.failed",
]);

function deploymentLifecycleDescription(event: ChatEvent): string | null {
  if (!DEPLOYMENT_LIFECYCLE_TYPES.has(event.event_type)) return null;
  const payload = event.payload;
  const branch = readString(payload, "branch") ?? readString(payload, "baseline_branch");
  const unitId = readString(payload, "unit_id");
  const failureReason = readString(payload, "failure_reason") ?? readString(payload, "message");
  if (event.event_type.endsWith("failed") && failureReason) {
    return failureReason;
  }
  const parts: string[] = [];
  if (branch) parts.push(branch);
  if (unitId) parts.push(`→ ${unitId}`);
  if (parts.length > 0) return parts.join(" ");
  return null;
}

export function getEventDisplayDescription(event: ChatEvent): string {
  const payload = event.payload;
  const toolName = readString(payload, "tool_name") ?? readString(payload, "name");
  const message = readString(payload, "message") ?? readString(payload, "error");
  const repository = readString(payload, "repository");
  const routePath = readString(payload, "route_path");
  const applicationId = readString(payload, "application_id");
  const documentId = readString(payload, "document_id");
  const chunkCount = readNumber(payload, "chunk_count");
  const fileCount = readNumber(payload, "file_count");

  if (event.event_type === "model.retry_scheduled") {
    const parsed = ModelRetryScheduledPayloadSchema.safeParse(payload);
    if (parsed.success) {
      const seconds = Math.max(0, Math.round(parsed.data.retry_after_ms / 1000));
      const label =
        parsed.data.category === "rate_limited"
          ? "Provider rate limit hit"
          : parsed.data.category === "provider_overloaded"
            ? "Provider overloaded"
            : "Transient provider issue";
      return `${label}. Retrying in ${seconds}s.`;
    }
  }

  if (event.event_type === "model.retrying") {
    const parsed = ModelRetryingPayloadSchema.safeParse(payload);
    if (parsed.success) {
      return "Retrying model request.";
    }
  }

  if (event.event_type === "model.provider_error") {
    const parsed = ModelProviderErrorPayloadSchema.safeParse(payload);
    if (parsed.success) {
      return parsed.data.message;
    }
  }

  if (event.event_type === "change.summary") {
    const branch = readString(payload, "branch");
    const target = readString(payload, "target_unit_id") ?? readString(payload, "target_application_id");
    const changedFiles = Array.isArray(payload.changed_files) ? (payload.changed_files as unknown[]).length : 0;
    const fileLabel = changedFiles ? `, ${changedFiles} ${changedFiles === 1 ? "file" : "files"}` : "";
    if (branch) {
      return target ? `${branch} → ${target}${fileLabel}` : `${branch}${fileLabel}`;
    }
  }

  const lifecycleDescription = deploymentLifecycleDescription(event);
  if (lifecycleDescription) return lifecycleDescription;

  if (message) return message;
  if (toolName) return event.tool_call_id ? `${toolName} (${event.tool_call_id.slice(0, 8)})` : toolName;
  if (repository) return fileCount ? `${repository}, ${fileCount} files indexed` : repository;
  if (routePath || applicationId) {
    const destination = [applicationId, routePath].filter(Boolean).join(" ");
    return event.tool_call_id ? `${destination} (${event.tool_call_id.slice(0, 8)})` : destination;
  }
  if (documentId) return chunkCount ? `${documentId}, ${chunkCount} chunks` : documentId;
  if (event.tool_call_id) return `Tool call ${event.tool_call_id.slice(0, 8)}`;
  return `${event.emitted_by} sequence ${event.sequence}`;
}

export function getEventDisplayStatus(event: ChatEvent): ActivityStatus {
  if (event.event_type.endsWith(".failed") || event.event_type.endsWith("_failed") || event.event_type === "error") return "failed";
  if (event.event_type.endsWith(".completed") || event.event_type.endsWith("_completed") || event.event_type === "document.uploaded") return "success";
  if (event.event_type.endsWith(".started") || event.event_type.endsWith("_started") || event.event_type === "context.requested") return "running";
  if (event.event_type === "preview.active" || event.event_type === "baseline.active" || event.event_type === "deployment.health_passed" || event.event_type === "deployment.build_finished") {
    return "success";
  }
  if (
    event.event_type === "deployment.requested" ||
    event.event_type === "deployment.submitted" ||
    event.event_type === "revert.requested" ||
    event.event_type === "baseline.deployment_submitted"
  ) {
    return "running";
  }
  if (event.event_type === "change.summary") return "info";
  if (event.event_type === "model.retry_scheduled" || event.event_type === "model.retrying") return "running";
  if (event.event_type === "model.provider_error") return "failed";
  if (event.event_type === "message.delta") return "info";
  return "info";
}

export function getEventDisplayIcon(event: ChatEvent): EventIconKind {
  if (event.event_type === "error" || event.event_type.endsWith(".failed")) return "error";
  if (event.event_type.startsWith("run.")) return "run";
  if (event.event_type.startsWith("context.")) return "context";
  if (event.event_type.startsWith("tool.")) return "tool";
  if (event.event_type.startsWith("document.")) return "document";
  if (event.event_type.startsWith("code.")) return "code";
  if (event.event_type.startsWith("navigation.")) return "navigation";
  if (event.event_type.startsWith("message.")) return "message";
  if (event.event_type.startsWith("model.")) return event.event_type === "model.provider_error" ? "error" : "run";
  if (
    event.event_type.startsWith("deployment.") ||
    event.event_type.startsWith("preview.") ||
    event.event_type.startsWith("revert.") ||
    event.event_type.startsWith("baseline.")
  ) {
    return "deployment";
  }
  return "run";
}

export function getAttachmentDisplayStatus(attachment: AttachmentStatus): ActivityStatus {
  if (attachment.status === "uploading") return "running";
  if (attachment.status === "ready") return "success";
  return "failed";
}

export function getAttachmentDisplayLabel(attachment: AttachmentStatus) {
  if (attachment.status === "uploading") return "Ingesting";
  if (attachment.status === "ready") return "Ready";
  return "Failed";
}
