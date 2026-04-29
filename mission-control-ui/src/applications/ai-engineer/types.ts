export interface ChatEvent {
  id: string;
  event_type: string;
  conversation_id: string;
  agent_run_id: string;
  request_id: string;
  tool_call_id?: string | null;
  sequence: number;
  emitted_by: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete";
  createdAt?: string;
}

export interface ChatEventChunk {
  kind: "event";
  event: ChatEvent;
}

export interface ChatMessageDeltaChunk {
  kind: "message.delta";
  conversation_id: string;
  agent_run_id: string;
  request_id: string;
  message_id: string | null;
  sequence: number;
  delta: string;
  created_at: string;
}

export type ChatStreamChunk = ChatEventChunk | ChatMessageDeltaChunk;

export interface AttachmentStatus {
  fileName: string;
  status: "uploading" | "ready" | "failed";
  documentId?: string;
  message?: string;
}
