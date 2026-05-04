export interface AgentEvent {
  id: string;
  event_type: string;
  conversation_id: string | null;
  agent_run_id: string;
  request_id: string;
  tool_call_id: string | null;
  sequence: number;
  emitted_by: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export type ChatEvent = AgentEvent;

export interface ChatMessageAttachment {
  id: string;
  fileName: string;
  size?: number;
  mimeType?: string;
  status?: "pending" | "uploading" | "ready" | "failed";
  documentId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  status?: "streaming" | "complete";
  createdAt?: string;
  attachments?: ChatMessageAttachment[];
}

export interface ChatEventChunk {
  kind: "event";
  event: AgentEvent;
}

export type ChatStreamChunk = ChatEventChunk;

export interface AttachmentStatus {
  id?: string;
  fileName: string;
  status: "uploading" | "ready" | "failed";
  documentId?: string;
  message?: string;
}

export type ExecutionMode = "read_only" | "suggest" | "execute";
