import { z } from "zod";

export const AgentPayloadSchema = z.record(z.unknown());

export const AgentEventSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  conversation_id: z.string().nullable().optional(),
  agent_run_id: z.string(),
  request_id: z.string(),
  tool_call_id: z.string().nullable().optional(),
  sequence: z.number(),
  emitted_by: z.string(),
  created_at: z.string(),
  payload: AgentPayloadSchema,
});

export const NormalizedAgentEventSchema = AgentEventSchema.transform((value) => ({
  ...value,
  conversation_id: value.conversation_id ?? null,
  tool_call_id: value.tool_call_id ?? null,
}));

export const StreamWrappedAgentEventSchema = z.object({
  kind: z.literal("event"),
  event: AgentEventSchema,
});

export const StreamLineSchema = z.union([AgentEventSchema, StreamWrappedAgentEventSchema]);

export const ConversationMessageSchema = z
  .object({
    id: z.string(),
    conversation_id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    metadata_json: z.record(z.unknown()).optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

const ExecutionModeSchema = z.enum([
  "read_only",
  "suggest",
  "execute",
  "governed_execute",
]);

export const ConversationSummarySchema = z
  .object({
    id: z.string(),
    title: z.string().nullable(),
    mission_id: z.string().nullable(),
    vehicle_id: z.string().nullable(),
    execution_mode: ExecutionModeSchema,
    selected_model_id: z.string().nullable().default(null),
    title_source: z.enum(["manual", "generated", "initial"]).nullable().default(null),
    title_model_id: z.string().nullable().default(null),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const ConversationDetailSchema = ConversationSummarySchema.extend({
  messages: z.array(ConversationMessageSchema),
  events: z.array(NormalizedAgentEventSchema),
}).passthrough();

export const ListConversationsResponseSchema = z.array(ConversationSummarySchema);

const ModelProviderTypeSchema = z.enum([
  "openai",
  "anthropic",
  "openai-compatible",
  "google",
  "azure-openai",
  "bedrock",
  "vertex",
  "vercel-gateway",
]);
const ModelDataBoundarySchema = z.enum(["external_api", "private_cloud", "local_airgapped", "unknown"]);
const ModelCapabilitySchema = z.enum(["text", "vision", "tool-use", "reasoning", "json", "file-input", "web-search", "code"]);

const ModelOptionSchema = z
  .object({
    id: z.string(),
    providerRef: z.string(),
    providerType: ModelProviderTypeSchema,
    providerModelId: z.string(),
    name: z.string(),
    provider: z.string(),
    description: z.string().nullable(),
    enabled: z.boolean(),
    isAvailable: z.boolean(),
    disabledReason: z.string().nullable(),
    isDefault: z.boolean(),
    defaultFor: z.array(z.string()),
    governance: z
      .object({
        allowedModes: z.array(ExecutionModeSchema),
        dataBoundary: ModelDataBoundarySchema,
      })
      .passthrough(),
    contextWindow: z.number().nullable(),
    maxOutputTokens: z.number().nullable(),
    inputModalities: z.array(z.string()),
    outputModalities: z.array(z.string()),
    supportedParameters: z.array(z.string()),
    capabilities: z.array(ModelCapabilitySchema),
    pricing: z
      .object({
        inputPerMillionTokens: z.number().nullable(),
        outputPerMillionTokens: z.number().nullable(),
        currency: z.enum(["USD", "internal"]).nullable(),
      })
      .passthrough(),
    qualityTier: z.enum(["standard", "advanced", "frontier", "unknown"]),
    costTier: z.enum(["$", "$$", "$$$", "$$$$", "internal", "unknown"]),
    speedTier: z.enum(["fast", "balanced", "deep", "unknown"]),
    reasoningTier: z.enum(["none", "light", "strong", "unknown"]),
    recommendedFor: z.array(z.string()),
    metadataSources: z.array(z.string()),
  })
  .passthrough();

export const ListAiEngineerModelsResponseSchema = z
  .object({
    default_model_id: z.string(),
    models: z.array(ModelOptionSchema),
    metadata: z
      .object({
        registrySource: z.literal("config"),
        metadataResolvers: z.array(z.string()),
        cached: z.boolean(),
        updatedAt: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export const UploadDocumentResponseSchema = z.object({
  document_id: z.string(),
});

export const MessageDeltaPayloadSchema = z.object({ text_delta: z.string() });
export const MessageCompletedPayloadSchema = z.object({ message_id: z.string() });
export const RunFailedPayloadSchema = z.object({ message: z.string().optional() }).passthrough();
export const ReasoningPayloadSchema = z.object({ representation: z.string().optional() }).passthrough();
