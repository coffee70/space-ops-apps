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

export type ReasoningStreamRepresentation = "reasoning" | "reasoning_summary" | "thinking";

export interface ChatMessageReasoning {
  content: string;
  status?: "streaming" | "complete";
  representation?: ReasoningStreamRepresentation;
  source?: "provider_exposed";
}

export interface ToolPermissionPrompt {
  title?: string;
  description?: string;
  primary_action?: string;
  secondary_action?: string;
  risk_level?: "low" | "medium" | "high" | string;
  details?: Record<string, unknown>;
}

export interface ChatMessageToolPermissionPart {
  kind: "tool-permission";
  permissionRequestId: string;
  toolCallId: string;
  toolName: string;
  status?: string;
  prompt: ToolPermissionPrompt;
  response?: Record<string, unknown> | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  status?: "streaming" | "complete";
  createdAt?: string;
  attachments?: ChatMessageAttachment[];
  reasoning?: ChatMessageReasoning;
  pendingToolTextBoundary?: boolean;
  part?: ChatMessageToolPermissionPart;
  parts?: ChatMessageToolPermissionPart[];
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

export type ExecutionMode =
  | "read_only"
  | "suggest"
  | "execute"
  | "governed_execute";

export interface AiEngineerConversationSummary {
  id: string;
  title: string | null;
  mission_id: string | null;
  vehicle_id: string | null;
  execution_mode: ExecutionMode;
  selected_model_id: string | null;
  title_source: "manual" | "generated" | "initial" | null;
  title_model_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiEngineerConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  request_id?: string | null;
  agent_run_id?: string | null;
  sequence?: number | null;
  metadata_json?: Record<string, unknown>;
  tool_permission_requests?: AiEngineerConversationMessageToolPermissionRequest[];
  created_at?: string;
}

export interface AiEngineerConversationMessageToolPermissionRequest {
  permission_request_id: string;
  tool_call_id: string;
  tool_name: string;
  status: string;
  prompt: ToolPermissionPrompt;
  response?: Record<string, unknown> | null;
}

export interface AiEngineerConversationDetail extends AiEngineerConversationSummary {
  messages: AiEngineerConversationMessage[];
  events: ChatEvent[];
}

export type ModelProviderType =
  | "openai"
  | "anthropic"
  | "openai-compatible"
  | "google"
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
