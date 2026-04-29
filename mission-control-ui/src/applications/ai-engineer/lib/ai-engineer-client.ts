import type { AttachmentStatus, ChatStreamChunk } from "@/applications/ai-engineer/types";

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

export async function getConversation(conversationId: string) {
  const response = await fetch(`/intelligence/agent/agent/conversations/${conversationId}`);
  if (!response.ok) throw new Error("Failed to load conversation");
  return response.json();
}

export async function sendChatMessage(params: {
  conversationId: string;
  message: string;
  executionMode?: string;
  onChunk: (chunk: ChatStreamChunk) => void;
}) {
  const response = await fetch("/intelligence/agent/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      execution_mode: params.executionMode ?? "read_only",
      messages: [{ role: "user", content: params.message }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Failed to contact agent runtime");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Agent runtime did not return a response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        params.onChunk(JSON.parse(line) as ChatStreamChunk);
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }

  const trailing = buffer.trim();
  if (trailing.length > 0) {
    params.onChunk(JSON.parse(trailing) as ChatStreamChunk);
  }

  return {
    agentRunId: response.headers.get("x-agent-run-id"),
    requestId: response.headers.get("x-request-id"),
  };
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
