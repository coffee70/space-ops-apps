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

/**
 * Identifies an assistant message that owns a change-preview lifecycle card
 * stack. The actual card state lives in the `useChangePreviewFlow` hook keyed
 * by `previewKey`. The chat stream owns the placement: each preview becomes a
 * real assistant message in transcript order, not a detached floating lane.
 */
export interface ChatMessagePreviewPart {
  kind: "change-preview";
  previewKey: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  status?: "streaming" | "complete";
  createdAt?: string;
  attachments?: ChatMessageAttachment[];
  /**
   * When set, the assistant message renders one structured message part in
   * place of free-form markdown. Used today by the change-preview lifecycle.
   */
  part?: ChatMessagePreviewPart;
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

export type ModelProviderType =
  | "openai"
  | "anthropic"
  | "openai-compatible"
  | "azure-openai"
  | "bedrock"
  | "vertex"
  | "vercel-gateway";

export type ModelDataBoundary = "external_api" | "private_cloud" | "local_airgapped" | "unknown";

export type ModelCapability =
  | "text"
  | "vision"
  | "tool-use"
  | "reasoning"
  | "json"
  | "file-input"
  | "web-search"
  | "code";

export interface AiEngineerModelOption {
  id: string;
  providerRef: string;
  providerType: ModelProviderType;
  providerModelId: string;
  name: string;
  provider: string;
  description: string | null;
  enabled: boolean;
  isAvailable: boolean;
  disabledReason: string | null;
  isDefault: boolean;
  defaultFor: string[];
  governance: {
    allowedModes: string[];
    dataBoundary: ModelDataBoundary;
  };
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  capabilities: ModelCapability[];
  pricing: {
    inputPerMillionTokens: number | null;
    outputPerMillionTokens: number | null;
    currency: "USD" | "internal" | null;
  };
  qualityTier: "standard" | "advanced" | "frontier" | "unknown";
  costTier: "$" | "$$" | "$$$" | "$$$$" | "internal" | "unknown";
  speedTier: "fast" | "balanced" | "deep" | "unknown";
  reasoningTier: "none" | "light" | "strong" | "unknown";
  recommendedFor: string[];
  metadataSources: string[];
}

export interface ListAiEngineerModelsResponse {
  default_model_id: string;
  models: AiEngineerModelOption[];
  metadata: {
    registrySource: "config";
    metadataResolvers: string[];
    cached: boolean;
    updatedAt: string;
  };
}
