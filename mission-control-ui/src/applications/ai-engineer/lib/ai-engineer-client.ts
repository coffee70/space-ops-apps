import type { AttachmentStatus } from "@/applications/ai-engineer/types";

export async function createConversation(payload: { title?: string; mission_id?: string; vehicle_id?: string; execution_mode?: string }) {
  const response = await fetch("/intelligence/agent/agent/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create conversation");
  return response.json();
}

export async function listConversations() {
  const response = await fetch("/intelligence/agent/agent/conversations");
  if (!response.ok) throw new Error("Failed to list conversations");
  return response.json();
}

export async function uploadDocument(params: {
  file: File;
  title?: string;
  documentType?: string;
  mission?: string;
  vehicle?: string;
  subsystem?: string;
  tags?: string;
  description?: string;
  conversationId?: string;
  agentRunId?: string;
  requestId?: string;
}): Promise<AttachmentStatus> {
  const formData = new FormData();
  formData.set("file", params.file);
  if (params.title) formData.set("title", params.title);
  if (params.documentType) formData.set("document_type", params.documentType);
  if (params.mission) formData.set("mission_id", params.mission);
  if (params.vehicle) formData.set("vehicle_id", params.vehicle);
  if (params.subsystem) formData.set("subsystem_id", params.subsystem);
  if (params.tags) formData.set("tags", params.tags);
  if (params.description) formData.set("description", params.description);
  if (params.conversationId) formData.set("conversation_id", params.conversationId);
  if (params.agentRunId) formData.set("agent_run_id", params.agentRunId);
  if (params.requestId) formData.set("request_id", params.requestId);

  const response = await fetch("/intelligence/documents/documents", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    return { fileName: params.file.name, status: "failed", message: text || "Upload failed" };
  }
  const data = await response.json();
  return { fileName: params.file.name, status: "ready", documentId: data.document_id };
}
