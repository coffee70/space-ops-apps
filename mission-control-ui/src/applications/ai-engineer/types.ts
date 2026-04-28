export interface ChatEvent {
  id: string;
  event_type: string;
  agent_run_id: string;
  tool_call_id?: string | null;
  sequence: number;
  emitted_by: string;
  payload: Record<string, unknown>;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AttachmentStatus {
  fileName: string;
  status: "uploading" | "ready" | "failed";
  documentId?: string;
  message?: string;
}
