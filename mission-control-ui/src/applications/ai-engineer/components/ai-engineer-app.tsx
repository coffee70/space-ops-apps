"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AiEngineerShell } from "@/applications/ai-engineer/components/ai-engineer-shell";
import { applyAgentEventToAssistantMessage } from "@/applications/ai-engineer/lib/agent-events";
import { sendChatMessage } from "@/applications/ai-engineer/lib/ai-engineer-client";
import type { AiEngineerChangeSummary } from "@/applications/ai-engineer/lib/change-preview-types";
import { useChangePreviewFlow } from "@/applications/ai-engineer/lib/use-change-preview-flow";
import type {
  AiEngineerConversationDetail,
  AiEngineerConversationMessage,
  AiEngineerModelOption,
  AttachmentStatus,
  ChatEvent,
  ChatMessage,
  ChatStreamChunk,
  ExecutionMode,
} from "@/applications/ai-engineer/types";
import { buildApplicationRoute, buildApplicationRouteWithQuery } from "@/platform/registry/application-routes";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";
import {
  useAiEngineerConversationQuery,
  useAiEngineerConversationsQuery,
  useAiEngineerModelsQuery,
  useCreateAiEngineerConversationMutation,
} from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";

const PREVIEW_MESSAGE_PREFIX = "preview-message::";
const SELECTED_MODEL_STORAGE_KEY = "ai-engineer.selectedModelId";
const DRAFT_INTENT_STORAGE_KEY = "ai-engineer.openDraft";

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

type DraftCreationResult = {
  conversationId: string;
  messageId: string | null;
};

function isEventForConversation(event: ChatEvent, conversationId: string | null) {
  return !event.conversation_id || event.conversation_id === conversationId;
}

function conversationEventsForHydration(conversation: AiEngineerConversationDetail): ChatEvent[] {
  return (conversation.events ?? []).filter((event) => isEventForConversation(event, conversation.id));
}

function markDraftIntent() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_INTENT_STORAGE_KEY, "1");
  } catch {
    /* ignore storage restrictions */
  }
}

function clearDraftIntent() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_INTENT_STORAGE_KEY);
  } catch {
    /* ignore storage restrictions */
  }
}

function consumeDraftIntent() {
  if (typeof window === "undefined") return false;
  try {
    const shouldOpenDraft = sessionStorage.getItem(DRAFT_INTENT_STORAGE_KEY) === "1";
    sessionStorage.removeItem(DRAFT_INTENT_STORAGE_KEY);
    return shouldOpenDraft;
  } catch {
    return false;
  }
}

export function AiEngineerApp(props: NativeApplicationProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentStatus[]>([]);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("read_only");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationListError, setConversationListError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const conversationPromiseRef = useRef<Promise<DraftCreationResult> | null>(null);
  const executionModeRef = useRef<ExecutionMode>(executionMode);
  const didBootstrapRef = useRef(false);
  const lastHydratedConversationIdRef = useRef<string | null>(null);

  const conversationsQuery = useAiEngineerConversationsQuery();
  const activeConversationQuery = useAiEngineerConversationQuery(activeConversationId, Boolean(activeConversationId));
  const modelsQuery = useAiEngineerModelsQuery();
  const createConversationMutation = useCreateAiEngineerConversationMutation();

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const models = useMemo(() => modelsQuery.data?.models ?? [], [modelsQuery.data]);

  useEffect(() => {
    executionModeRef.current = executionMode;
  }, [executionMode]);

  const changePreviewFlow = useChangePreviewFlow({
    onTimelineEvent: (event) => {
      if (!isEventForConversation(event, conversationIdRef.current)) return;
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
  const ingestPreviewEvent = changePreviewFlow.ingestEvent;
  const resetChangePreviewFlow = changePreviewFlow.reset;

  const hydratePersistedConversation = useCallback(
    (conversation: AiEngineerConversationDetail) => {
      const persistedEvents = conversationEventsForHydration(conversation);
      resetChangePreviewFlow();
      setMessages(mapConversationMessagesToChatMessages(conversation.messages));
      setEvents(persistedEvents);
      setAttachments([]);
      for (const event of persistedEvents) {
        ingestPreviewEvent(event);
      }
      lastHydratedConversationIdRef.current = conversation.id;
    },
    [ingestPreviewEvent, resetChangePreviewFlow],
  );

  const setActiveConversationId = useCallback((id: string) => {
    conversationIdRef.current = id;
    setActiveConversationIdState(id);
  }, []);

  const clearActiveConversationId = useCallback(() => {
    conversationIdRef.current = null;
    setActiveConversationIdState(null);
  }, []);

  const replaceConversationRoute = useCallback(
    (conversationId: string) => {
      clearDraftIntent();
      const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
      params.set("conversation_id", conversationId);
      const nextUrl = buildApplicationRouteWithQuery(props.application.applicationId, props.appPath, params);
      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== nextUrl) {
        window.history.replaceState(window.history.state, "", nextUrl);
      }
    },
    [props.appPath, props.application.applicationId],
  );

  const replaceDraftRoute = useCallback(() => {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    params.delete("conversation_id");
    const nextUrl = buildApplicationRouteWithQuery(props.application.applicationId, props.appPath, params);
    if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [props.appPath, props.application.applicationId]);

  const resetTransientConversationState = useCallback(() => {
    setEvents([]);
    setAttachments([]);
  }, []);

  const createConversationFromDraft = useCallback(
    async (initialContent: string) => {
      if (conversationIdRef.current) return null;
      if (conversationPromiseRef.current) {
        return conversationPromiseRef.current;
      }

      const creationPromise = createConversationMutation
        .mutateAsync({
          title: "AI Engineer Session",
          execution_mode: executionModeRef.current,
          initial_message: { role: "user", content: initialContent },
        })
        .then((created) => {
          setActiveConversationId(created.id);
          replaceConversationRoute(created.id);
          hydratePersistedConversation(created);
          return { conversationId: created.id, messageId: created.messages[0]?.id ?? null };
        })
        .finally(() => {
          conversationPromiseRef.current = null;
        });

      conversationPromiseRef.current = creationPromise;
      return creationPromise;
    },
    [createConversationMutation, hydratePersistedConversation, replaceConversationRoute, setActiveConversationId],
  );

  useEffect(() => {
    if (didBootstrapRef.current) return;
    const requestedConversationId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("conversation_id");
    if (requestedConversationId) {
      didBootstrapRef.current = true;
      setActiveConversationId(requestedConversationId);
      setIsBootstrapping(false);
      return;
    }
    if (conversationsQuery.isPending) return;
    didBootstrapRef.current = true;
    const shouldOpenDraft = consumeDraftIntent();
    if (!shouldOpenDraft && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
      replaceConversationRoute(conversations[0].id);
    } else {
      clearActiveConversationId();
      setMessages([]);
      resetTransientConversationState();
    }
    setIsBootstrapping(false);
  }, [
    clearActiveConversationId,
    conversations,
    conversationsQuery.isPending,
    replaceConversationRoute,
    resetTransientConversationState,
    setActiveConversationId,
  ]);

  useEffect(() => {
    if (conversationsQuery.isError) {
      setConversationListError(conversationsQuery.error instanceof Error ? conversationsQuery.error.message : "Failed to list conversations");
      setIsBootstrapping(false);
    } else if (conversationsQuery.isSuccess) {
      setConversationListError(null);
    }
  }, [conversationsQuery.error, conversationsQuery.isError, conversationsQuery.isSuccess]);

  useEffect(() => {
    const conversation = activeConversationQuery.data;
    if (!conversation || conversation.id !== conversationIdRef.current) return;
    hydratePersistedConversation(conversation);
    setIsSwitchingConversation(false);
  }, [activeConversationQuery.data, hydratePersistedConversation]);

  useEffect(() => {
    if (!activeConversationQuery.isError) return;
    setConversationListError(activeConversationQuery.error instanceof Error ? activeConversationQuery.error.message : "Failed to load conversation");
    setIsSwitchingConversation(false);
    setIsBootstrapping(false);
  }, [activeConversationQuery.error, activeConversationQuery.isError]);

  useEffect(() => {
    if (!modelsQuery.data) return;
    setSelectedModelId((current) => {
      const available = modelsQuery.data.models.filter((model) => model.enabled && model.isAvailable);
      if (current && available.some((model) => model.id === current)) return current;
      return resolveInitialModelId(modelsQuery.data.models, modelsQuery.data.default_model_id);
    });
  }, [modelsQuery.data]);

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
      conversationPromiseRef.current = null;
      clearActiveConversationId();
      lastHydratedConversationIdRef.current = null;
      resetChangePreviewFlow();
      setMessages([]);
      resetTransientConversationState();
      markDraftIntent();
      replaceDraftRoute();
    } catch (error) {
      setConversationListError(error instanceof Error ? error.message : "Failed to start draft");
    } finally {
      setIsSwitchingConversation(false);
    }
  }, [clearActiveConversationId, isStreaming, replaceDraftRoute, resetChangePreviewFlow, resetTransientConversationState]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (isStreaming || conversationId === activeConversationId) return;
      setIsSwitchingConversation(true);
      setConversationListError(null);
      conversationPromiseRef.current = null;
      setActiveConversationId(conversationId);
      lastHydratedConversationIdRef.current = null;
      resetTransientConversationState();
      const cached = queryClient.getQueryData<AiEngineerConversationDetail>(queryKeys.aiEngineerConversation(conversationId));
      if (cached) {
        hydratePersistedConversation(cached);
        setIsSwitchingConversation(false);
      } else {
        resetChangePreviewFlow();
        setMessages([]);
      }
      replaceConversationRoute(conversationId);
    },
    [
      activeConversationId,
      hydratePersistedConversation,
      isStreaming,
      queryClient,
      replaceConversationRoute,
      resetChangePreviewFlow,
      resetTransientConversationState,
      setActiveConversationId,
    ],
  );

  const appendBackendEvent = (event: ChatEvent) => {
    if (!isEventForConversation(event, conversationIdRef.current)) return;
    setEvents((previous) => {
      const next = previous.filter((existingEvent) => existingEvent.id !== event.id);
      next.push(event);
      return next;
    });
  };

  const applyStreamChunk = (draftAssistantId: string, chunk: ChatStreamChunk) => {
    if (!isEventForConversation(chunk.event, conversationIdRef.current)) return;
    appendBackendEvent(chunk.event);
    ingestPreviewEvent(chunk.event);
    setMessages((previous) => applyAgentEventToAssistantMessage(previous, draftAssistantId, chunk.event));
  };

  const onSend = async (text: string) => {
    const trimmed = text.trim();
    const hasText = trimmed.length > 0;

    if (!hasText) return;

    const initialContent = trimmed;
    let draftCreation: DraftCreationResult | null = null;
    let activeConversationId = conversationIdRef.current;
    try {
      draftCreation = activeConversationId ? null : await createConversationFromDraft(initialContent);
      activeConversationId = draftCreation?.conversationId ?? conversationIdRef.current;
      if (!activeConversationId) {
        throw new Error("Failed to create conversation");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create conversation";
      setConversationListError(message);
      conversationPromiseRef.current = null;
      setMessages((previous) => [
        ...previous,
        {
          id: createClientId(),
          role: "assistant",
          content: message,
          status: "complete",
        },
      ]);
      return;
    }
    const userMessage: ChatMessage = {
      id: draftCreation?.messageId ?? createClientId(),
      role: "user",
      content: initialContent,
      status: "complete",
    };
    const assistantDraftId = createClientId();
    setMessages((prev) => [
      ...prev.filter((message) => message.id !== userMessage.id),
      userMessage,
      { id: assistantDraftId, role: "assistant", content: "", status: "streaming" },
    ]);
    setIsStreaming(true);

    try {
      await sendChatMessage({
        conversationId: activeConversationId,
        message: trimmed,
        executionMode,
        modelId: selectedModelId ?? undefined,
        persistedUserMessageId: draftCreation?.messageId ?? undefined,
        onChunk: (chunk) => applyStreamChunk(assistantDraftId, chunk),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversations });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversation(activeConversationId) });
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
    } finally {
      setIsStreaming(false);
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
      isLoadingModels={modelsQuery.isPending}
      modelLoadError={modelsQuery.isError ? (modelsQuery.error instanceof Error ? modelsQuery.error.message : "Failed to load models") : null}
      selectedModelName={selectedModelName}
      conversations={conversations}
      activeConversationId={activeConversationId}
      isLoadingConversations={conversations.length === 0 && conversationsQuery.isPending}
      conversationListError={conversationListError}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
    />
  );
}
