import type { AttachmentStatus, ChatEvent } from "@/applications/ai-engineer/types";

export type ActivityStatus = "pending" | "running" | "success" | "failed" | "info";
export type EventIconKind = "run" | "context" | "tool" | "document" | "code" | "navigation" | "message" | "error";

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
    "change.summary": "Change preview ready",
    error: "Error",
  };

  return titles[event.event_type] ?? humanizeEventType(event.event_type);
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

  if (event.event_type === "change.summary") {
    const branch = readString(payload, "branch");
    const target = readString(payload, "target_unit_id") ?? readString(payload, "target_application_id");
    const changedFiles = Array.isArray(payload.changed_files) ? (payload.changed_files as unknown[]).length : 0;
    const fileLabel = changedFiles ? `, ${changedFiles} ${changedFiles === 1 ? "file" : "files"}` : "";
    if (branch) {
      return target ? `${branch} → ${target}${fileLabel}` : `${branch}${fileLabel}`;
    }
  }

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
  if (event.event_type === "change.summary") return "info";
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
