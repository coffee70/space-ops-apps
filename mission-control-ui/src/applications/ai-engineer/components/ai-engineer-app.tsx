"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AiEngineerShell } from "@/applications/ai-engineer/components/ai-engineer-shell";
import { applyAgentEventToAssistantMessage } from "@/applications/ai-engineer/lib/agent-events";
import { createConversation, getConversation, listConversations, sendChatMessage, uploadDocument } from "@/applications/ai-engineer/lib/ai-engineer-client";
import type { AttachmentStatus, ChatEvent, ChatMessage, ChatStreamChunk, ExecutionMode } from "@/applications/ai-engineer/types";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";

function createClientId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function AiEngineerApp(props: NativeApplicationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentStatus[]>([]);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("read_only");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const conversationPromiseRef = useRef<Promise<string> | null>(null);

  const setActiveConversationId = (id: string) => {
    conversationIdRef.current = id;
  };

  const ensureConversation = useCallback(async () => {
    if (conversationIdRef.current) return conversationIdRef.current;
    if (conversationPromiseRef.current) return conversationPromiseRef.current;

    conversationPromiseRef.current = createConversation({ title: "AI Engineer Session", execution_mode: "read_only" }).then((created) => {
      setActiveConversationId(created.id);
      return created.id;
    });
    return conversationPromiseRef.current;
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const requestedConversationId = new URLSearchParams(window.location.search).get("conversation_id");
      if (requestedConversationId) {
        const activeConversation = await getConversation(requestedConversationId);
        setActiveConversationId(activeConversation.id);
        setMessages(
          activeConversation.messages.map((message: { id: string; role: "user" | "assistant"; content: string; created_at?: string }) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            status: "complete",
            createdAt: message.created_at,
          })),
        );
        return activeConversation.id;
      }

      const existing = await listConversations();
      if (Array.isArray(existing) && existing.length > 0) {
        const activeConversation = await getConversation(existing[0].id);
        setActiveConversationId(activeConversation.id);
        setMessages(
          activeConversation.messages.map((message: { id: string; role: "user" | "assistant"; content: string; created_at?: string }) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            status: "complete",
            createdAt: message.created_at,
          })),
        );
        return activeConversation.id;
      }
      const created = await createConversation({ title: "AI Engineer Session", execution_mode: "read_only" });
      setActiveConversationId(created.id);
      return created.id;
    };
    conversationPromiseRef.current = bootstrap()
      .then(() => conversationIdRef.current ?? ensureConversation())
      .finally(() => {
        conversationPromiseRef.current = null;
        setIsBootstrapping(false);
      });
    conversationPromiseRef.current.catch((error) => {
      console.error(error);
      setIsBootstrapping(false);
    });
  }, [ensureConversation]);

  const uploadFiles = async (files: File[], activeConversationId: string) => {
    for (const file of files) {
      const localAttachmentId = createClientId();
      setAttachments((prev) => [...prev, { id: localAttachmentId, fileName: file.name, status: "uploading" }]);
      try {
        const result = await uploadDocument({
          file,
          conversationId: activeConversationId,
        });
        setAttachments((prev) => prev.map((attachment) => (attachment.id === localAttachmentId ? { ...result, id: localAttachmentId } : attachment)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setAttachments((prev) =>
          prev.map((attachment) => (attachment.id === localAttachmentId ? { ...attachment, status: "failed", message } : attachment)),
        );
      }
    }
  };

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
    const trimmed = text.trim();
    const hasText = trimmed.length > 0;
    const hasFiles = files.length > 0;

    if (!hasText && !hasFiles) return;

    const activeConversationId = await ensureConversation();
    const userMessage: ChatMessage = {
      id: createClientId(),
      role: "user",
      content: hasText ? trimmed : "Uploaded mission document(s)",
      status: "complete",
      attachments: files.map((file) => ({
        id: createClientId(),
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        status: "pending",
      })),
    };
    const assistantDraftId = createClientId();
    setMessages((prev) =>
      hasText ? [...prev, userMessage, { id: assistantDraftId, role: "assistant", content: "", status: "streaming" }] : [...prev, userMessage],
    );

    if (hasText) {
      setIsStreaming(true);
    }

    try {
      if (hasFiles) {
        await uploadFiles(files, activeConversationId);
      }

      if (!hasText) return;

      await sendChatMessage({
        conversationId: activeConversationId,
        message: trimmed,
        executionMode,
        onChunk: (chunk) => applyStreamChunk(assistantDraftId, chunk),
      });
    } catch (error) {
      if (!hasText) return;

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
    } finally {
      if (hasText) {
        setIsStreaming(false);
      }
    }
  };

  const title = useMemo(() => props.application.title ?? "AI Engineer", [props.application.title]);

  return (
    <AiEngineerShell
      title={title}
      messages={messages}
      events={events}
      attachments={attachments}
      executionMode={executionMode}
      onExecutionModeChange={setExecutionMode}
      onSend={onSend}
      disabled={isBootstrapping}
      isBootstrapping={isBootstrapping}
      isStreaming={isStreaming}
    />
  );
}
