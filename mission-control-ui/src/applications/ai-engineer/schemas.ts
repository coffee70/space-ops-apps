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
    role: z.enum(["user", "assistant", "tool"]),
    content: z.string(),
    request_id: z.string().nullable().optional(),
    agent_run_id: z.string().nullable().optional(),
    sequence: z.number().nullable().optional(),
    metadata_json: z.record(z.unknown()).optional(),
    tool_permission_requests: z
      .array(
        z
          .object({
            permission_request_id: z.string(),
            tool_call_id: z.string(),
            tool_name: z.string(),
            status: z.string(),
            prompt: z.record(z.unknown()),
            response: z.record(z.unknown()).nullable().optional(),
          })
          .passthrough(),
      )
      .optional(),
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

export const ModelBudgetStatusSchema = z.enum(["normal", "watch", "danger", "exhausted", "throttled", "unknown"]);
export const LanguageModelUsageSnapshotSchema = z
  .object({
    input_tokens: z.number().int().nonnegative().nullable(),
    output_tokens: z.number().int().nonnegative().nullable(),
    total_tokens: z.number().int().nonnegative().nullable(),
    reasoning_tokens: z.number().int().nonnegative().nullable(),
    cached_input_tokens: z.number().int().nonnegative().nullable(),
    raw: z.unknown().nullable().optional(),
    source: z.enum([
      "ai_sdk_step_usage",
      "ai_sdk_total_usage",
      "provider_gateway",
      "provider_count_tokens",
      "estimated_current_step",
      "estimated_preflight",
    ]),
    step_index: z.number().int().nonnegative().nullable().optional(),
    synced_after: z.string().nullable().optional(),
    is_actual: z.boolean(),
  })
  .passthrough();

export const ModelBudgetSnapshotPayloadSchema = z
  .object({
    provider_type: z.string().min(1),
    provider_model_id: z.string().min(1),
    model_id: z.string().min(1).nullable().optional(),
    source: z.enum(["estimated", "provider_headers", "provider_error", "configured", "mixed"]),
    measured_at: z.string(),
    usage: LanguageModelUsageSnapshotSchema.nullable().optional(),
    context: z
      .object({
        limit_tokens: z.number().int().positive().nullable(),
        used_tokens: z.number().int().nonnegative().nullable(),
        remaining_tokens: z.number().int().nonnegative().nullable(),
        percent_used: z.number().nonnegative().nullable(),
        status: ModelBudgetStatusSchema.exclude(["throttled"]),
        measurement_source: z.enum(["provider_usage", "provider_count_tokens", "estimated", "configured", "unknown"]),
      })
      .passthrough(),
    throughput: z
      .object({
        window_seconds: z.number().int().positive().nullable(),
        limit_tokens: z.number().int().positive().nullable(),
        used_tokens: z.number().int().nonnegative().nullable(),
        remaining_tokens: z.number().int().nonnegative().nullable(),
        percent_used: z.number().nonnegative().nullable(),
        reset_at: z.string().nullable(),
        seconds_until_reset: z.number().nonnegative().nullable(),
        status: ModelBudgetStatusSchema,
        measurement_source: z.enum(["provider_usage", "provider_headers", "provider_error", "configured_rolling_window", "estimated", "mixed", "unknown"]),
      })
      .passthrough(),
  })
  .passthrough();

export const ModelBudgetWarningPayloadSchema = z
  .object({
    kind: z.enum(["context", "throughput"]),
    status: z.enum(["watch", "danger", "exhausted", "throttled"]),
    message: z.string().min(1),
    percent_used: z.number().nonnegative().nullable(),
    remaining_tokens: z.number().int().nonnegative().nullable(),
    reset_at: z.string().nullable().optional(),
    provider_type: z.string().min(1),
    provider_model_id: z.string().min(1),
  })
  .passthrough();

export const ModelRetryScheduledPayloadSchema = z
  .object({
    provider_type: z.string().min(1),
    provider_model_id: z.string().min(1),
    category: z.enum(["rate_limited", "provider_overloaded", "network_transient"]),
    attempt: z.number().int().positive(),
    max_attempts: z.number().int().positive(),
    retry_after_ms: z.number().int().nonnegative(),
    retry_at: z.string(),
    safe_to_retry: z.boolean(),
  })
  .passthrough();

export const ModelRetryingPayloadSchema = z
  .object({
    provider_type: z.string().min(1),
    provider_model_id: z.string().min(1),
    attempt: z.number().int().positive(),
    max_attempts: z.number().int().positive(),
  })
  .passthrough();

export const ModelProviderErrorPayloadSchema = z
  .object({
    provider_type: z.string().min(1),
    provider_model_id: z.string().min(1),
    category: z.enum([
      "rate_limited",
      "quota_exceeded",
      "context_length_exceeded",
      "auth_failed",
      "model_unavailable",
      "provider_overloaded",
      "network_transient",
      "cancelled",
      "unknown",
    ]),
    retryable: z.boolean(),
    retry_after_ms: z.number().int().nonnegative().nullable(),
    provider_error_type: z.string().nullable().optional(),
    provider_error_code: z.string().nullable().optional(),
    http_status: z.number().int().positive().nullable().optional(),
    message: z.string().min(1),
  })
  .passthrough();

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
    runtimeBudget: z
      .object({
        contextWindowTokens: z.number().int().positive().nullable(),
        maxOutputTokens: z.number().int().positive().nullable(),
        tokensPerMinute: z.number().int().positive().nullable(),
        requestsPerMinute: z.number().int().positive().nullable(),
        rollingWindowSeconds: z.number().int().positive().nullable(),
      })
      .nullable()
      .optional(),
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
    chat_title_generation: z
      .object({
        model_id: z.string().nullable(),
      })
      .optional(),
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
export const RunFailedPayloadSchema = z
  .object({
    message: z.string().optional(),
    error_code: z.string().optional(),
    category: z.string().optional(),
    retryable: z.boolean().optional(),
    can_continue: z.boolean().optional(),
    retry_after_ms: z.number().int().nonnegative().nullable().optional(),
    provider_type: z.string().optional(),
    provider_model_id: z.string().optional(),
  })
  .passthrough();
export const ReasoningPayloadSchema = z.object({ representation: z.string().optional() }).passthrough();
