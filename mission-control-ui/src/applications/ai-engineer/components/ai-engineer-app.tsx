"use client";

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
  ChatMessageReasoning,
  ChatStreamChunk,
  ExecutionMode,
  ReasoningStreamRepresentation,
  ToolPermissionPrompt,
} from "@/applications/ai-engineer/types";
import { buildApplicationRouteWithQuery } from "@/platform/registry/application-routes";
import type { NativeApplicationProps } from "@/platform/sdk/native-application-contract";
import {
  useAiEngineerConversationQuery,
  useAiEngineerConversationsQuery,
  useAiEngineerModelsQuery,
  useFrontendRuntimeStatusQuery,
  useCreateAiEngineerConversationMutation,
} from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";

const PERMISSION_MESSAGE_PREFIX = "permission-message::";
const SELECTED_MODEL_STORAGE_KEY = "ai-engineer.selectedModelId";
const DRAFT_INTENT_STORAGE_KEY = "ai-engineer.openDraft";
const FRONTEND_RUNTIME_INVALIDATING_EVENT_TYPES = new Set([
  "deployment.requested",
  "deployment.submitted",
  "deployment.build_started",
  "preview.active",
  "revert.requested",
  "baseline.deployment_submitted",
  "baseline.build_started",
  "baseline.active",
  "deployment.failed",
  "revert.failed",
]);

function shouldInvalidateFrontendRuntimeStatus(event: ChatEvent): boolean {
  return FRONTEND_RUNTIME_INVALIDATING_EVENT_TYPES.has(event.event_type);
}

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

function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError",
  );
}

function parseReasoningRepresentation(value: unknown): ReasoningStreamRepresentation | undefined {
  return value === "reasoning" || value === "reasoning_summary" || value === "thinking" ? value : undefined;
}

function mapPersistedReasoning(metadata: Record<string, unknown> | undefined): ChatMessageReasoning | undefined {
  const candidate = metadata?.reasoning;
  if (!candidate || typeof candidate !== "object") return undefined;
  const reasoning = candidate as Record<string, unknown>;
  const text = typeof reasoning.text === "string" ? reasoning.text : "";
  if (text.trim().length === 0) return undefined;
  return {
    content: text,
    status: "complete",
    representation: parseReasoningRepresentation(reasoning.representation),
    source: reasoning.source === "provider_exposed" ? "provider_exposed" : undefined,
  };
}

function mapConversationMessagesToChatMessages(messages: AiEngineerConversationMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    status: "complete",
    createdAt: message.created_at,
    reasoning: message.role === "assistant" ? mapPersistedReasoning(message.metadata_json) : undefined,
  }));
}

function rebuildAssistantTextFromEvents(message: ChatMessage, events: ChatEvent[]): ChatMessage {
  if (message.role !== "assistant" || message.part) return message;
  const relevantEvents = events
    .filter((event) => event.event_type === "message.delta" || event.event_type.startsWith("tool."))
    .sort((a, b) => a.sequence - b.sequence);
  if (!relevantEvents.some((event) => event.event_type === "message.delta")) {
    return message;
  }
  let rebuilt: ChatMessage = { ...message, content: "", pendingToolTextBoundary: false };
  for (const event of relevantEvents) {
    rebuilt = applyAgentEventToAssistantMessage([rebuilt], rebuilt.id, event)[0] ?? rebuilt;
  }
  return {
    ...rebuilt,
    id: message.id,
    status: message.status,
    reasoning: message.reasoning,
  };
}

function mapConversationMessagesToChatMessagesWithEvents(
  messages: AiEngineerConversationMessage[],
  events: ChatEvent[],
): ChatMessage[] {
  const eventsByRequest = new Map<string, ChatEvent[]>();
  for (const event of events) {
    const existing = eventsByRequest.get(event.request_id) ?? [];
    existing.push(event);
    eventsByRequest.set(event.request_id, existing);
  }
  return mapConversationMessagesToChatMessages(messages).map((message, index) => {
    const source = messages[index];
    const requestId = typeof source?.metadata_json?.request_id === "string" ? source.metadata_json.request_id : null;
    return requestId ? rebuildAssistantTextFromEvents(message, eventsByRequest.get(requestId) ?? []) : message;
  });
}

function permissionMessageFromEvent(event: ChatEvent): ChatMessage | null {
  if (event.event_type !== "tool.permission_required") return null;
  const payload = event.payload;
  const permissionRequestId = typeof payload.permission_request_id === "string" ? payload.permission_request_id : null;
  const toolCallId =
    typeof payload.tool_call_id === "string" ? payload.tool_call_id : event.tool_call_id;
  const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "tool";
  const prompt =
    payload.prompt && typeof payload.prompt === "object" && !Array.isArray(payload.prompt)
      ? (payload.prompt as ToolPermissionPrompt)
      : {};
  if (!permissionRequestId || !toolCallId) return null;
  return {
    id: `${PERMISSION_MESSAGE_PREFIX}${permissionRequestId}`,
    role: "assistant",
    content: "",
    status: "complete",
    part: {
      kind: "tool-permission",
      permissionRequestId,
      toolCallId,
      toolName,
      prompt,
    },
  };
}

function appendPermissionMessage(messages: ChatMessage[], event: ChatEvent): ChatMessage[] {
  const permissionMessage = permissionMessageFromEvent(event);
  if (!permissionMessage) return messages;
  if (messages.some((message) => message.id === permissionMessage.id)) return messages;
  return [...messages, permissionMessage];
}

type DraftCreationResult = {
  conversationId: string;
  messageId: string | null;
};

type PendingMessageDelta = {
  draftAssistantId: string;
  event: ChatEvent;
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
  const activeChatAbortControllerRef = useRef<AbortController | null>(null);
  const activeStreamingRunIdRef = useRef<string | null>(null);
  const preserveCancelledDraftUntilRunHydratedRef = useRef<string | null>(null);
  const didBootstrapRef = useRef(false);
  const lastHydratedConversationIdRef = useRef<string | null>(null);
  const pendingMessageDeltasRef = useRef<PendingMessageDelta[]>([]);
  const messageDeltaFrameRef = useRef<number | null>(null);

  const conversationsQuery = useAiEngineerConversationsQuery();
  const activeConversationQuery = useAiEngineerConversationQuery(activeConversationId, Boolean(activeConversationId));
  const modelsQuery = useAiEngineerModelsQuery();
  const frontendRuntimeStatusQuery = useFrontendRuntimeStatusQuery();
  const createConversationMutation = useCreateAiEngineerConversationMutation();
  const previewFlow = useChangePreviewFlow({
    onTimelineEvent: (event) => {
      setEvents((previous) => [...previous, event]);
      if (shouldInvalidateFrontendRuntimeStatus(event)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.frontendRuntimeStatus });
      }
    },
  });
  const { deployChange, ingestEvent, isBusyForChange, previews, reset, revertChange } = previewFlow;

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const models = useMemo(() => modelsQuery.data?.models ?? [], [modelsQuery.data]);

  useEffect(() => {
    executionModeRef.current = executionMode;
  }, [executionMode]);

  const applyPendingMessageDeltas = useCallback((pending: PendingMessageDelta[]) => {
    if (pending.length === 0) return;
    setMessages((previous) =>
      pending.reduce(
        (current, { draftAssistantId, event }) => applyAgentEventToAssistantMessage(current, draftAssistantId, event),
        previous,
      ),
    );
  }, []);

  const flushPendingMessageDeltas = useCallback(() => {
    messageDeltaFrameRef.current = null;
    const pending = pendingMessageDeltasRef.current;
    pendingMessageDeltasRef.current = [];
    applyPendingMessageDeltas(pending);
  }, [applyPendingMessageDeltas]);

  const scheduleMessageDeltaFlush = useCallback(
    (draftAssistantId: string, event: ChatEvent) => {
      pendingMessageDeltasRef.current.push({ draftAssistantId, event });
      if (messageDeltaFrameRef.current !== null) return;
      messageDeltaFrameRef.current = window.requestAnimationFrame(flushPendingMessageDeltas);
    },
    [flushPendingMessageDeltas],
  );

  const flushPendingMessageDeltasNow = useCallback(() => {
    if (messageDeltaFrameRef.current !== null) {
      window.cancelAnimationFrame(messageDeltaFrameRef.current);
      messageDeltaFrameRef.current = null;
    }
    const pending = pendingMessageDeltasRef.current;
    pendingMessageDeltasRef.current = [];
    applyPendingMessageDeltas(pending);
  }, [applyPendingMessageDeltas]);

  useEffect(
    () => () => {
      if (messageDeltaFrameRef.current !== null) {
        window.cancelAnimationFrame(messageDeltaFrameRef.current);
      }
      messageDeltaFrameRef.current = null;
      pendingMessageDeltasRef.current = [];
    },
    [],
  );

  const hydratePersistedConversation = useCallback(
    (conversation: AiEngineerConversationDetail) => {
      const persistedEvents = conversationEventsForHydration(conversation);
      const persistedMessages = persistedEvents.reduce(
        (current, event) => appendPermissionMessage(current, event),
        mapConversationMessagesToChatMessagesWithEvents(conversation.messages, persistedEvents),
      );
      setMessages(persistedMessages);
      setEvents(persistedEvents);
      reset();
      for (const event of persistedEvents) {
        ingestEvent(event);
      }
      if (persistedEvents.some(shouldInvalidateFrontendRuntimeStatus)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.frontendRuntimeStatus });
      }
      setAttachments([]);
      lastHydratedConversationIdRef.current = conversation.id;
    },
    [ingestEvent, queryClient, reset],
  );

  const setActiveConversationId = useCallback((id: string) => {
    preserveCancelledDraftUntilRunHydratedRef.current = null;
    activeStreamingRunIdRef.current = null;
    conversationIdRef.current = id;
    setActiveConversationIdState(id);
  }, []);

  const clearActiveConversationId = useCallback(() => {
    preserveCancelledDraftUntilRunHydratedRef.current = null;
    activeStreamingRunIdRef.current = null;
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
    reset();
    setAttachments([]);
  }, [reset]);

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
    if (isStreaming) return;
    const cancelledRunId = preserveCancelledDraftUntilRunHydratedRef.current;
    if (cancelledRunId) {
      const hasPersistedCancellation = conversationEventsForHydration(conversation).some(
        (event) => event.agent_run_id === cancelledRunId && event.event_type === "run.cancelled",
      );
      if (!hasPersistedCancellation) return;
      preserveCancelledDraftUntilRunHydratedRef.current = null;
    }
    hydratePersistedConversation(conversation);
    setIsSwitchingConversation(false);
  }, [activeConversationQuery.data, hydratePersistedConversation, isStreaming]);

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
      flushPendingMessageDeltasNow();
      clearActiveConversationId();
      lastHydratedConversationIdRef.current = null;
      setMessages([]);
      resetTransientConversationState();
      markDraftIntent();
      replaceDraftRoute();
    } catch (error) {
      setConversationListError(error instanceof Error ? error.message : "Failed to start draft");
    } finally {
      setIsSwitchingConversation(false);
    }
  }, [clearActiveConversationId, flushPendingMessageDeltasNow, isStreaming, replaceDraftRoute, resetTransientConversationState]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (isStreaming || conversationId === activeConversationId) return;
      setIsSwitchingConversation(true);
      setConversationListError(null);
      conversationPromiseRef.current = null;
      flushPendingMessageDeltasNow();
      setActiveConversationId(conversationId);
      lastHydratedConversationIdRef.current = null;
      resetTransientConversationState();
      const cached = queryClient.getQueryData<AiEngineerConversationDetail>(queryKeys.aiEngineerConversation(conversationId));
      if (cached) {
        hydratePersistedConversation(cached);
        setIsSwitchingConversation(false);
      } else {
        setMessages([]);
      }
      replaceConversationRoute(conversationId);
    },
    [
      activeConversationId,
      flushPendingMessageDeltasNow,
      hydratePersistedConversation,
      isStreaming,
      queryClient,
      replaceConversationRoute,
      resetTransientConversationState,
      setActiveConversationId,
    ],
  );

  const appendBackendEvent = (event: ChatEvent) => {
    if (!isEventForConversation(event, conversationIdRef.current)) return;
    ingestEvent(event);
    if (shouldInvalidateFrontendRuntimeStatus(event)) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.frontendRuntimeStatus });
    }
    setEvents((previous) => {
      const next = previous.filter((existingEvent) => existingEvent.id !== event.id);
      next.push(event);
      return next;
    });
  };

  const applyStreamChunk = (draftAssistantId: string, chunk: ChatStreamChunk) => {
    if (!isEventForConversation(chunk.event, conversationIdRef.current)) return;
    activeStreamingRunIdRef.current = chunk.event.agent_run_id;
    appendBackendEvent(chunk.event);
    if (chunk.event.event_type.startsWith("tool.")) {
      flushPendingMessageDeltasNow();
    }
    if (chunk.event.event_type === "tool.permission_required") {
      setMessages((previous) => appendPermissionMessage(previous, chunk.event));
    }
    if (chunk.event.event_type === "message.delta" || chunk.event.event_type === "message.reasoning.delta") {
      scheduleMessageDeltaFlush(draftAssistantId, chunk.event);
      return;
    }
    if (
      chunk.event.event_type === "message.completed" ||
      chunk.event.event_type === "message.reasoning.completed" ||
      chunk.event.event_type === "run.failed" ||
      chunk.event.event_type === "run.cancelled"
    ) {
      flushPendingMessageDeltasNow();
    }
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
    activeStreamingRunIdRef.current = null;
    const abortController = new AbortController();
    activeChatAbortControllerRef.current = abortController;
    setIsStreaming(true);

    try {
      await sendChatMessage({
        conversationId: activeConversationId,
        message: trimmed,
        executionMode,
        modelId: selectedModelId ?? undefined,
        persistedUserMessageId: draftCreation?.messageId ?? undefined,
        signal: abortController.signal,
        onChunk: (chunk) => applyStreamChunk(assistantDraftId, chunk),
      });
      flushPendingMessageDeltasNow();
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversations });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversation(activeConversationId) });
    } catch (error) {
      flushPendingMessageDeltasNow();
      if (isAbortError(error)) {
        const cancelledRunId = activeStreamingRunIdRef.current;
        if (cancelledRunId) {
          preserveCancelledDraftUntilRunHydratedRef.current = cancelledRunId;
        }
        setMessages((previous) =>
          previous.map((item) =>
            item.id === assistantDraftId
              ? {
                  ...item,
                  status: "complete",
                  reasoning: item.reasoning ? { ...item.reasoning, status: "complete" } : item.reasoning,
                }
              : item,
          ),
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversations });
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversation(activeConversationId) });
      } else {
        const message = error instanceof Error ? error.message : "Failed to contact agent runtime.";
        setMessages((previous) =>
          previous.map((item) =>
            item.id === assistantDraftId
              ? {
                  ...item,
                  content: message,
                  status: "complete",
                  reasoning: item.reasoning ? { ...item.reasoning, status: "complete" } : item.reasoning,
                }
              : item,
          ),
        );
      }
    } finally {
      if (activeChatAbortControllerRef.current === abortController) {
        activeChatAbortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  const handleStop = useCallback(() => {
    activeChatAbortControllerRef.current?.abort();
  }, []);

  const title = useMemo(() => props.application.title ?? "AI Engineer", [props.application.title]);

  const handleOpenPreviewApp = useCallback((change: AiEngineerChangeSummary) => {
    if (!change.targetApplicationId) return;
    window.location.href = buildApplicationRouteWithQuery(change.targetApplicationId);
  }, []);

  const selectedModelName = useMemo(() => {
    if (!selectedModelId) return null;
    return models.find((m) => m.id === selectedModelId)?.name ?? null;
  }, [models, selectedModelId]);

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
      onStop={handleStop}
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
      runtimeStatus={frontendRuntimeStatusQuery.data}
      previewStates={previews}
      isBusyForChange={isBusyForChange}
      onDeployChange={(change) => {
        void deployChange(change);
      }}
      onRevertChange={(change) => {
        void revertChange(change);
      }}
      onOpenPreviewApp={handleOpenPreviewApp}
    />
  );
}
