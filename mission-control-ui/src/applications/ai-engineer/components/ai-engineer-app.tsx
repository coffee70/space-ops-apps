"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AiEngineerShell } from "@/applications/ai-engineer/components/ai-engineer-shell";
import { applyAgentEventToAssistantMessage } from "@/applications/ai-engineer/lib/agent-events";
import { createConversation, getConversation, listConversations, listModels, sendChatMessage, uploadDocument } from "@/applications/ai-engineer/lib/ai-engineer-client";
import type { AiEngineerChangeSummary } from "@/applications/ai-engineer/lib/change-preview-types";
import { useChangePreviewFlow } from "@/applications/ai-engineer/lib/use-change-preview-flow";
import type {
  AiEngineerConversationDetail,
  AiEngineerConversationMessage,
  AiEngineerConversationSummary,
  AiEngineerModelOption,
  AttachmentStatus,
  ChatEvent,
  ChatMessage,
  ChatStreamChunk,
  ExecutionMode,
} from "@/applications/ai-engineer/types";
import { buildApplicationRoute, buildApplicationRouteWithQuery } from "@/platform/registry/application-routes";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";

const PREVIEW_MESSAGE_PREFIX = "preview-message::";
const SELECTED_MODEL_STORAGE_KEY = "ai-engineer.selectedModelId";

function resolveInitialModelId(models: AiEngineerModelOption[], defaultModelId: string): string | null {
  const available = models.filter((m) => m.enabled && m.isAvailable);
  if (available.length === 0) return null;
  if (typeof window === "undefined") return available[0]?.id ?? null;
  const stored = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  if (stored && available.some((m) => m.id === stored)) return stored;
  const def = models.find((m) => m.id === defaultModelId);
  if (def?.enabled && def.isAvailable) return defaultModelId;
  const demo = available.find((m) => m.recommendedFor.includes("demo-safe"));
  if (demo) return demo.id;
  return available[0]?.id ?? null;
}

function createClientId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function mapConversationMessagesToChatMessages(messages: AiEngineerConversationMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    status: "complete",
    createdAt: message.created_at,
  }));
}

export function AiEngineerApp(props: NativeApplicationProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentStatus[]>([]);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("read_only");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<AiEngineerConversationSummary[]>([]);
  const [conversationListLoading, setConversationListLoading] = useState(true);
  const [conversationListError, setConversationListError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [models, setModels] = useState<AiEngineerModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const conversationPromiseRef = useRef<Promise<string> | null>(null);
  const executionModeRef = useRef<ExecutionMode>(executionMode);

  useEffect(() => {
    executionModeRef.current = executionMode;
  }, [executionMode]);

  const changePreviewFlow = useChangePreviewFlow({
    onTimelineEvent: (event) => {
      setEvents((previous) => {
        const next = previous.filter((existing) => existing.id !== event.id);
        next.push(event);
        return next;
      });
    },
    onPreviewSummaryReceived: ({ previewKey }) => {
      // Append the lifecycle card as a real assistant chat message so the
      // deploy/revert decisions appear inline with the rest of the
      // conversation (instead of in a detached lane below the transcript).
      setMessages((previous) => {
        const messageId = `${PREVIEW_MESSAGE_PREFIX}${previewKey}`;
        if (previous.some((existing) => existing.id === messageId)) return previous;
        return [
          ...previous,
          {
            id: messageId,
            role: "assistant",
            content: "",
            status: "complete",
            part: { kind: "change-preview", previewKey },
          },
        ];
      });
    },
  });

  const setActiveConversationId = useCallback((id: string) => {
    conversationIdRef.current = id;
    setActiveConversationIdState(id);
  }, []);

  const replaceConversationRoute = useCallback(
    (conversationId: string) => {
      const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
      params.set("conversation_id", conversationId);
      router.replace(buildApplicationRouteWithQuery(props.application.applicationId, props.appPath, params));
    },
    [props.appPath, props.application.applicationId, router],
  );

  const resetTransientConversationState = useCallback(() => {
    setEvents([]);
    setAttachments([]);
  }, []);

  const refreshConversationList = useCallback(async () => {
    setConversationListLoading(true);
    setConversationListError(null);
    try {
      const recent = (await listConversations()) as AiEngineerConversationSummary[];
      setConversations(Array.isArray(recent) ? recent : []);
      return Array.isArray(recent) ? recent : [];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list conversations";
      setConversationListError(message);
      return null;
    } finally {
      setConversationListLoading(false);
    }
  }, []);

  const hydrateConversation = useCallback(
    async (conversationId: string) => {
      const conversation = (await getConversation(conversationId)) as AiEngineerConversationDetail;
      setActiveConversationId(conversation.id);
      setMessages(mapConversationMessagesToChatMessages(conversation.messages));
      resetTransientConversationState();
      return conversation;
    },
    [resetTransientConversationState, setActiveConversationId],
  );

  const ensureConversation = useCallback(async () => {
    if (conversationIdRef.current) return conversationIdRef.current;
    if (conversationPromiseRef.current) return conversationPromiseRef.current;

    conversationPromiseRef.current = createConversation({ title: "AI Engineer Session", execution_mode: executionModeRef.current }).then((created) => {
      setActiveConversationId(created.id);
      return created.id;
    });
    return conversationPromiseRef.current;
  }, [setActiveConversationId]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const requestedConversationId = new URLSearchParams(window.location.search).get("conversation_id");
      if (requestedConversationId) {
        const activeConversation = await hydrateConversation(requestedConversationId);
        await refreshConversationList();
        return activeConversation.id;
      }

      const existing = await refreshConversationList();
      if (existing && existing.length > 0) {
        const activeConversation = await hydrateConversation(existing[0].id);
        replaceConversationRoute(activeConversation.id);
        return activeConversation.id;
      }

      const created = (await createConversation({ title: "AI Engineer Session", execution_mode: executionModeRef.current })) as AiEngineerConversationSummary;
      setActiveConversationId(created.id);
      setMessages([]);
      replaceConversationRoute(created.id);
      await refreshConversationList();
      return created.id;
    };
    conversationPromiseRef.current = bootstrap()
      .then(() => {
        if (cancelled) return conversationIdRef.current ?? "";
        return conversationIdRef.current ?? ensureConversation();
      })
      .finally(() => {
        if (cancelled) return;
        conversationPromiseRef.current = null;
        setIsBootstrapping(false);
      });
    conversationPromiseRef.current.catch((error) => {
      console.error(error);
      if (cancelled) return;
      setConversationListError(error instanceof Error ? error.message : "Failed to load conversation");
      setIsBootstrapping(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ensureConversation, hydrateConversation, refreshConversationList, replaceConversationRoute, setActiveConversationId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingModels(true);
    setModelLoadError(null);
    listModels()
      .then((data) => {
        if (cancelled) return;
        setModels(data.models);
        setSelectedModelId(resolveInitialModelId(data.models, data.default_model_id));
      })
      .catch((error) => {
        if (!cancelled) setModelLoadError(error instanceof Error ? error.message : "Failed to load models");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    try {
      localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    } catch {
      /* ignore quota / privacy mode */
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    if (isStreaming) return;
    setIsSwitchingConversation(true);
    setConversationListError(null);
    try {
      const created = (await createConversation({
        title: "AI Engineer Session",
        execution_mode: executionModeRef.current,
      })) as AiEngineerConversationSummary;
      conversationPromiseRef.current = null;
      setActiveConversationId(created.id);
      setMessages([]);
      resetTransientConversationState();
      replaceConversationRoute(created.id);
      await refreshConversationList();
    } catch (error) {
      setConversationListError(error instanceof Error ? error.message : "Failed to create conversation");
    } finally {
      setIsSwitchingConversation(false);
    }
  }, [isStreaming, refreshConversationList, replaceConversationRoute, resetTransientConversationState, setActiveConversationId]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      if (isStreaming || conversationId === activeConversationId) return;
      setIsSwitchingConversation(true);
      setConversationListError(null);
      try {
        const conversation = await hydrateConversation(conversationId);
        conversationPromiseRef.current = null;
        replaceConversationRoute(conversation.id);
      } catch (error) {
        setConversationListError(error instanceof Error ? error.message : "Failed to load conversation");
      } finally {
        setIsSwitchingConversation(false);
      }
    },
    [activeConversationId, hydrateConversation, isStreaming, replaceConversationRoute],
  );

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
    changePreviewFlow.ingestEvent(chunk.event);
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
        modelId: selectedModelId ?? undefined,
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

  const selectedModelName = useMemo(() => {
    if (!selectedModelId) return null;
    return models.find((m) => m.id === selectedModelId)?.name ?? null;
  }, [models, selectedModelId]);

  const handleOpenApp = useCallback(
    (change: AiEngineerChangeSummary) => {
      // Open app must only navigate to a real application route. Service-only
      // changes don't have an `/apps/<id>` path, so we no-op rather than
      // generating an invalid URL.
      if (!change.targetApplicationId) return;
      router.push(buildApplicationRoute(change.targetApplicationId));
    },
    [router],
  );

  return (
    <AiEngineerShell
      title={title}
      messages={messages}
      events={events}
      attachments={attachments}
      executionMode={executionMode}
      onExecutionModeChange={setExecutionMode}
      onSend={onSend}
      disabled={isBootstrapping || isSwitchingConversation}
      isBootstrapping={isBootstrapping}
      isStreaming={isStreaming}
      getPreviewState={changePreviewFlow.getStateByKey}
      onDeployChange={changePreviewFlow.deployChange}
      onRevertChange={changePreviewFlow.revertChange}
      onOpenApp={handleOpenApp}
      isPreviewBusy={changePreviewFlow.isBusyForChange}
      models={models}
      selectedModelId={selectedModelId}
      onModelSelect={handleModelSelect}
      isLoadingModels={isLoadingModels}
      modelLoadError={modelLoadError}
      selectedModelName={selectedModelName}
      conversations={conversations}
      activeConversationId={activeConversationId}
      isLoadingConversations={conversationListLoading}
      conversationListError={conversationListError}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
    />
  );
}
