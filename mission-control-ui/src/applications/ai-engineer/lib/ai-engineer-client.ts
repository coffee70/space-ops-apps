"use client";

import type {
  AiEngineerConversationDetail,
  AiEngineerConversationSummary,
  AttachmentStatus,
  ChatStreamChunk,
  ListAiEngineerModelsResponse,
} from "@/applications/ai-engineer/types";
import { chunkFromEvent, normalizeStreamLine } from "@/applications/ai-engineer/lib/agent-events";
import {
  ConversationDetailSchema,
  ListAiEngineerModelsResponseSchema,
  ListConversationsResponseSchema,
  UploadDocumentResponseSchema,
} from "@/applications/ai-engineer/schemas";
import { resolvePublicApiUrl } from "@/lib/public-api-origin";
import { z } from "zod";

const ROUTES = {
  createConversation: "/intelligence/agent/conversations",
  listConversations: "/intelligence/agent/conversations",
  getConversation: (conversationId: string) => `/intelligence/agent/conversations/${conversationId}`,
  chat: "/intelligence/agent/chat",
  models: "/intelligence/agent/models",
  uploadDocument: "/intelligence/documents",
} as const;

/** Prefix intelligence routes; base is same-origin when NEXT_PUBLIC_API_URL is unset (edge proxy). */
function apiUrl(path: string): string {
  const base = resolvePublicApiUrl().replace(/\/$/, "");
  return `${base}${path}`;
}

function isStreamDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.localStorage.getItem("ai-engineer:debug-stream") === "1" ||
    new URLSearchParams(window.location.search).get("debugAiEngineerStream") === "1"
  );
}

async function parseJsonResponse<T>(response: Response, schema: z.ZodType<T, z.ZodTypeDef, unknown>, label: string): Promise<T> {
  const raw = await response.json();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`${label} response validation failed`, parsed.error.issues);
    throw new Error(`Invalid ${label} response from server`);
  }
  return parsed.data;
}

export async function listModels(): Promise<ListAiEngineerModelsResponse> {
  const response = await fetch(apiUrl(ROUTES.models));
  if (!response.ok) {
    throw new Error(`Failed to load model catalog (${response.status}). Is the platform gateway up?`);
  }
  return parseJsonResponse(response, ListAiEngineerModelsResponseSchema, "model catalog");
}

export async function createConversation(payload: {
  title?: string;
  mission_id?: string;
  vehicle_id?: string;
  execution_mode?: string;
  selected_model_id?: string | null;
  initial_message: { role: "user"; content: string; metadata?: Record<string, unknown> };
}): Promise<AiEngineerConversationDetail> {
  const response = await fetch(apiUrl(ROUTES.createConversation), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create conversation");
  return parseJsonResponse(response, ConversationDetailSchema, "created conversation");
}

export async function updateConversation(
  conversationId: string,
  payload: { title?: string; execution_mode?: string; selected_model_id?: string | null },
): Promise<AiEngineerConversationDetail> {
  const response = await fetch(apiUrl(ROUTES.getConversation(conversationId)), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update conversation");
  return parseJsonResponse(response, ConversationDetailSchema, "updated conversation");
}

export async function listConversations(): Promise<AiEngineerConversationSummary[]> {
  const response = await fetch(apiUrl(ROUTES.listConversations));
  if (!response.ok) throw new Error("Failed to list conversations");
  return parseJsonResponse(response, ListConversationsResponseSchema, "conversation list");
}

export async function getConversation(conversationId: string): Promise<AiEngineerConversationDetail> {
  const response = await fetch(apiUrl(ROUTES.getConversation(conversationId)));
  if (!response.ok) throw new Error("Failed to load conversation");
  return parseJsonResponse(response, ConversationDetailSchema, "conversation");
}

export async function sendChatMessage(params: {
  conversationId: string;
  message: string;
  executionMode?: string;
  modelId?: string;
  persistedUserMessageId?: string;
  signal?: AbortSignal;
  onChunk: (chunk: ChatStreamChunk) => void;
}) {
  const response = await fetch(apiUrl(ROUTES.chat), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      execution_mode: params.executionMode ?? "read_only",
      model_id: params.modelId ?? undefined,
      persisted_user_message_id: params.persistedUserMessageId ?? undefined,
      messages: [{ role: "user", content: params.message }],
    }),
    signal: params.signal,
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
  const debugStream = isStreamDebugEnabled();

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        const event = normalizeStreamLine(line);
        if (debugStream) {
          console.debug(
            "[ai-engineer-client] ndjson line received",
            JSON.stringify({
              timestamp: new Date().toISOString(),
              lineLength: line.length,
              preview: line.slice(0, 120),
            }),
          );
        }
        params.onChunk(chunkFromEvent(event));
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }

  const trailing = buffer.trim();
  if (trailing.length > 0) {
    const event = normalizeStreamLine(trailing);
    if (debugStream) {
      console.debug(
        "[ai-engineer-client] trailing ndjson line received",
        JSON.stringify({
          timestamp: new Date().toISOString(),
          lineLength: trailing.length,
          preview: trailing.slice(0, 120),
        }),
      );
    }
    params.onChunk(chunkFromEvent(event));
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

  const response = await fetch(apiUrl(ROUTES.uploadDocument), {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    return { fileName: params.file.name, status: "failed", message: text || "Upload failed" };
  }
  const data = await parseJsonResponse(response, UploadDocumentResponseSchema, "document upload");
  return { fileName: params.file.name, status: "ready", documentId: data.document_id };
}
