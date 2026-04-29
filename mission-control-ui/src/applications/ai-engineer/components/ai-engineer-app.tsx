"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionTimeline } from "@/applications/ai-engineer/components/action-timeline";
import { AttachmentUploadStatus } from "@/applications/ai-engineer/components/attachment-upload-status";
import { ChatPanel } from "@/applications/ai-engineer/components/chat-panel";
import { applyAgentEventToAssistantMessage } from "@/applications/ai-engineer/lib/agent-events";
import { createConversation, getConversation, listConversations, sendChatMessage, uploadDocument } from "@/applications/ai-engineer/lib/ai-engineer-client";
import type { AttachmentStatus, ChatEvent, ChatMessage, ChatStreamChunk, ExecutionMode } from "@/applications/ai-engineer/types";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";

export function AiEngineerApp(props: NativeApplicationProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentStatus[]>([]);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("read_only");

  useEffect(() => {
    const bootstrap = async () => {
      const existing = await listConversations();
      if (Array.isArray(existing) && existing.length > 0) {
        const activeConversation = await getConversation(existing[0].id);
        setConversationId(activeConversation.id);
        setMessages(
          activeConversation.messages.map((message: { id: string; role: "user" | "assistant"; content: string; created_at?: string }) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            status: "complete",
            createdAt: message.created_at,
          })),
        );
        return;
      }
      const created = await createConversation({ title: "AI Engineer Session", execution_mode: "read_only" });
      setConversationId(created.id);
    };
    bootstrap().catch(console.error);
  }, []);

  const appendBackendEvent = (event: ChatEvent) => {
    setEvents((previous) => {
      const next = previous.filter((existingEvent) => existingEvent.id !== event.id);
      next.push(event);
      return next;
    });
  };

  const applyStreamChunk = (draftAssistantId: string, chunk: ChatStreamChunk) => {
    appendBackendEvent(chunk.event);
    setMessages((previous) => applyAgentEventToAssistantMessage(previous, draftAssistantId, chunk.event));
  };

  const onSend = async (text: string, files: File[]) => {
    const shouldSendChat = text.trim().length > 0;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text || "[attachment upload]", status: "complete" };
    const assistantDraftId = crypto.randomUUID();
    setMessages((prev) =>
      shouldSendChat ? [...prev, userMessage, { id: assistantDraftId, role: "assistant", content: "", status: "streaming" }] : [...prev, userMessage],
    );

    for (const file of files) {
      setAttachments((prev) => [...prev, { fileName: file.name, status: "uploading" }]);
      const result = await uploadDocument({
        file,
        conversationId: conversationId || undefined,
      });
      setAttachments((prev) => prev.map((attachment) => (attachment.fileName === file.name && attachment.status === "uploading" ? result : attachment)));
    }

    if (!conversationId || !shouldSendChat) return;

    try {
      await sendChatMessage({
        conversationId,
        message: text,
        executionMode,
        onChunk: (chunk) => applyStreamChunk(assistantDraftId, chunk),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to contact agent runtime.";
      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantDraftId
            ? {
                ...item,
                content: message,
                status: "complete",
              }
            : item,
        ),
      );
    }
  };

  const title = useMemo(() => props.application.title ?? "AI Engineer", [props.application.title]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <ChatPanel
          messages={messages}
          attachments={attachments}
          onSend={onSend}
          executionMode={executionMode}
          onExecutionModeChange={setExecutionMode}
        />
      </div>
      <div className="space-y-3">
        <ActionTimeline events={events} />
        <AttachmentUploadStatus attachments={attachments} />
      </div>
    </div>
  );
}
