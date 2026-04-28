"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionTimeline } from "@/applications/ai-engineer/components/ActionTimeline";
import { AttachmentUploadStatus } from "@/applications/ai-engineer/components/AttachmentUploadStatus";
import { ChatPanel } from "@/applications/ai-engineer/components/ChatPanel";
import { createConversation, listConversations, uploadDocument } from "@/applications/ai-engineer/lib/ai-engineer-client";
import type { AttachmentStatus, ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";

export function AiEngineerApp(props: NativeApplicationProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentStatus[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      const existing = await listConversations();
      if (Array.isArray(existing) && existing.length > 0) {
        setConversationId(existing[0].id);
        return;
      }
      const created = await createConversation({ title: "AI Engineer Session", execution_mode: "read_only" });
      setConversationId(created.id);
    };
    bootstrap().catch(console.error);
  }, []);

  const onSend = async (text: string, files: File[]) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text || "[attachment upload]" };
    setMessages((prev) => [...prev, userMessage]);

    const agentRunId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    setEvents((prev) => [
      ...prev,
      { id: crypto.randomUUID(), event_type: "run.started", agent_run_id: agentRunId, sequence: prev.length + 1, emitted_by: "ai-engineer-ui", payload: { execution_mode: "read_only" } },
      { id: crypto.randomUUID(), event_type: "context.requested", agent_run_id: agentRunId, sequence: prev.length + 2, emitted_by: "ai-engineer-ui", payload: { retrieval_plan: "auto" } },
    ]);

    for (const file of files) {
      setAttachments((prev) => [...prev, { fileName: file.name, status: "uploading" }]);
      const result = await uploadDocument({
        file,
        conversationId: conversationId || undefined,
        agentRunId,
        requestId,
      });
      setAttachments((prev) => prev.map((attachment) => (attachment.fileName === file.name && attachment.status === "uploading" ? result : attachment)));
      setEvents((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          event_type: result.status === "ready" ? "document.ingestion_completed" : "document.ingestion_failed",
          agent_run_id: agentRunId,
          sequence: prev.length + 1,
          emitted_by: "document-knowledge-service",
          payload: { file_name: file.name, document_id: result.documentId },
        },
      ]);
    }

    if (!conversationId) return;

    const response = await fetch("/intelligence/agent/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        execution_mode: "read_only",
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!response.ok) {
      const errorMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "Failed to contact agent runtime." };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      full += decoder.decode(chunk.value, { stream: true });
    }

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: full || "No response." }]);
    setEvents((prev) => [...prev, { id: crypto.randomUUID(), event_type: "run.completed", agent_run_id: agentRunId, sequence: prev.length + 1, emitted_by: "agent-runtime-service", payload: {} }]);
  };

  const title = useMemo(() => props.application.title ?? "AI Engineer", [props.application.title]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <ChatPanel messages={messages} attachments={attachments} onSend={onSend} />
      </div>
      <div className="space-y-3">
        <ActionTimeline events={events} />
        <AttachmentUploadStatus attachments={attachments} />
      </div>
    </div>
  );
}
