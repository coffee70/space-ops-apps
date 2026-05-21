import { SimulatorRuntimeStatusSchema } from "@/lib/simulator-schemas";
import { z } from "zod";

const StringArraySchema = z.array(z.string());
const UnknownRecordSchema = z.record(z.unknown());

export const WatchlistEntrySchema = z
  .object({
    name: z.string(),
    aliases: StringArraySchema.optional(),
    display_order: z.number(),
    channel_origin: z.string().optional(),
    discovery_namespace: z.string().nullable().optional(),
  })
  .passthrough();

export const TelemetryListEntrySchema = z
  .object({
    name: z.string(),
    aliases: StringArraySchema.optional(),
    channel_origin: z.string().optional(),
    discovery_namespace: z.string().nullable().optional(),
  })
  .passthrough();

export const TelemetryInventoryEntrySchema = TelemetryListEntrySchema.extend({
  aliases: StringArraySchema,
  description: z.string().nullable().optional(),
  units: z.string().nullable().optional(),
  subsystem_tag: z.string(),
  channel_origin: z.string(),
  current_value: z.number().nullable().optional(),
  last_timestamp: z.string().nullable().optional(),
  state: z.string(),
  state_reason: z.string().nullable().optional(),
  z_score: z.number().nullable().optional(),
  is_anomalous: z.boolean(),
  has_data: z.boolean(),
  red_low: z.number().nullable().optional(),
  red_high: z.number().nullable().optional(),
  n_samples: z.number().nullable().optional(),
}).passthrough();

export const TelemetrySourceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    source_type: z.string().optional(),
    base_url: z.string().nullable().optional(),
    vehicle_config_path: z.string().optional(),
  })
  .passthrough();

export const SourceObservationSchema = z
  .object({
    id: z.string(),
    source_id: z.string(),
    external_id: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "missed"]),
    start_time: z.string(),
    end_time: z.string(),
    station_name: z.string().nullable().optional(),
    station_id: z.string().nullable().optional(),
    receiver_id: z.string().nullable().optional(),
    max_elevation_deg: z.number().nullable().optional(),
    details: UnknownRecordSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const VehicleConfigParsedSummarySchema = z
  .object({
    version: z.number(),
    name: z.string().nullable().optional(),
    channel_count: z.number(),
    scenario_names: StringArraySchema,
    has_position_mapping: z.boolean(),
    has_ingestion: z.boolean(),
  })
  .passthrough();

export const VehicleConfigValidationErrorSchema = z
  .object({
    loc: StringArraySchema,
    message: z.string(),
    type: z.string(),
  })
  .passthrough();

export const VehicleConfigListItemSchema = z
  .object({
    path: z.string(),
    filename: z.string(),
    name: z.string().nullable().optional(),
    category: z.string(),
    format: z.string(),
    modified_at: z.string().nullable().optional(),
  })
  .passthrough();

export const VehicleConfigDocumentSchema = z
  .object({
    path: z.string(),
    content: z.string(),
    format: z.string(),
    parsed: VehicleConfigParsedSummarySchema.nullable().optional(),
    validation_errors: z.array(VehicleConfigValidationErrorSchema),
  })
  .passthrough();

export const VehicleConfigValidationResponseSchema = z
  .object({
    valid: z.boolean(),
    parsed: VehicleConfigParsedSummarySchema.nullable().optional(),
    errors: z.array(VehicleConfigValidationErrorSchema),
  })
  .passthrough();

export const VehicleConfigSaveResponseSchema = z
  .object({
    path: z.string(),
    parsed: VehicleConfigParsedSummarySchema,
    saved: z.boolean(),
  })
  .passthrough();

export const AiEngineerModelConfigParsedSummarySchema = z
  .object({
    provider_count: z.number(),
    model_count: z.number(),
    enabled_model_count: z.number(),
    default_model_id: z.string().nullable().optional(),
    provider_types: StringArraySchema,
    missing_api_key_envs: StringArraySchema,
    warnings: StringArraySchema.optional(),
  })
  .passthrough();

export const AiEngineerModelConfigValidationErrorSchema = VehicleConfigValidationErrorSchema;

export const AiEngineerModelConfigDocumentSchema = z
  .object({
    path: z.string(),
    content: z.string(),
    format: z.literal("yaml"),
    parsed: AiEngineerModelConfigParsedSummarySchema.nullable().optional(),
    validation_errors: z.array(AiEngineerModelConfigValidationErrorSchema),
  })
  .passthrough();

export const AiEngineerModelConfigValidationResponseSchema = z
  .object({
    valid: z.boolean(),
    parsed: AiEngineerModelConfigParsedSummarySchema.nullable().optional(),
    errors: z.array(AiEngineerModelConfigValidationErrorSchema),
  })
  .passthrough();

export const AiEngineerModelConfigSaveResponseSchema = z
  .object({
    path: z.string(),
    parsed: AiEngineerModelConfigParsedSummarySchema,
    saved: z.boolean(),
  })
  .passthrough();

export const DeploymentUiStateSchema = z.enum([
  "healthy",
  "deploying",
  "stale",
  "missing",
  "failed",
  "crashed",
  "unknown",
  "skipped",
  "blocked",
]);

export const ServiceStatusItemSchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
    group: z.enum(["core", "runtime"]),
    expected: z.boolean(),
    exists: z.boolean(),
    ui_state: DeploymentUiStateSchema,
    health_status: z.string().nullable().optional(),
    deployment_status: z.string().nullable().optional(),
    bootstrap_status: z.string().nullable().optional(),
    container_state: z.string().nullable().optional(),
    container_status: z.string().nullable().optional(),
    active_deployment_id: z.string().nullable().optional(),
    latest_deployment_id: z.string().nullable().optional(),
    service_slug: z.string().nullable().optional(),
    runtime_kind: z.string().nullable().optional(),
    runtime_template: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    commit_sha: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    last_checked_at: z.string().nullable().optional(),
    failure_reason: z.string().nullable().optional(),
    latest_error: z.string().nullable().optional(),
    logs_url: z.string().nullable().optional(),
    details: UnknownRecordSchema,
  })
  .passthrough();

export const SystemDeploymentOverviewResponseSchema = z
  .object({
    generated_at: z.string(),
    overall_state: z.enum(["healthy", "degraded", "broken", "unknown"]),
    core: z.object({
      expected_count: z.number(),
      existing_count: z.number(),
      healthy_count: z.number(),
      warning_count: z.number(),
      broken_count: z.number(),
      missing_count: z.number(),
      services: z.array(ServiceStatusItemSchema),
    }).passthrough(),
    runtime: z.object({
      expected_count: z.number(),
      existing_count: z.number(),
      healthy_count: z.number(),
      warning_count: z.number(),
      broken_count: z.number(),
      missing_count: z.number(),
      services: z.array(ServiceStatusItemSchema),
    }).passthrough(),
    bootstrap: z
      .object({
        run_id: z.number().nullable().optional(),
        status: z.string(),
        started_at: z.string().nullable().optional(),
        completed_at: z.string().nullable().optional(),
        failure_reason: z.string().nullable().optional(),
        summary: z.record(z.number()),
        dependency_issues: z
          .object({
            cycles: z.array(z.object({ units: StringArraySchema, path: StringArraySchema }).passthrough()),
            blocked_units: z.array(
              z
                .object({
                  unit_id: z.string(),
                  reason: z.string(),
                  blocking_units: StringArraySchema.optional(),
                })
                .passthrough(),
            ),
            invalid_dependencies: z.array(UnknownRecordSchema).optional(),
          })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const ActiveFrontendPreviewRuntimeResponseSchema = z
  .object({
    is_preview: z.boolean(),
    frontend_unit_id: z.string().nullable().optional(),
    active_deployment_id: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    commit_sha: z.string().nullable().optional(),
    deployment_status: z.string().nullable().optional(),
    health_status: z.string().nullable().optional(),
    baseline_branch: z.string(),
    baseline_commit_sha: z.string().nullable().optional(),
    preview_deployment_id: z.string().nullable().optional(),
    target_application_id: z.string().nullable().optional(),
  })
  .passthrough();

export type ActiveFrontendPreviewRuntimeResponse = z.infer<typeof ActiveFrontendPreviewRuntimeResponseSchema>;

export const CodeRepositoryStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    source_uri: z.string(),
    layer: z.string(),
    default_branch: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    chunk_count: z.number(),
    index_status: z.string(),
    indexed_commit_sha: z.string().nullable().optional(),
    current_commit_sha: z.string().nullable().optional(),
    file_count: z.number(),
    skipped_file_count: z.number(),
    failed_file_count: z.number(),
    last_error: z.string().nullable().optional(),
    index_requested_at: z.string().nullable().optional(),
    index_started_at: z.string().nullable().optional(),
    index_completed_at: z.string().nullable().optional(),
  })
  .passthrough();

export const SearchResultSchema = z
  .object({
    name: z.string(),
    aliases: StringArraySchema.optional(),
    match_confidence: z.number(),
    description: z.string().nullable().optional(),
    subsystem_tag: z.string().nullable().optional(),
    units: z.string(),
    channel_origin: z.string().optional(),
    discovery_namespace: z.string().nullable().optional(),
    current_value: z.number().nullable().optional(),
    current_status: z.string().nullable().optional(),
    last_timestamp: z.string().nullable().optional(),
  })
  .passthrough();

export const TelemetryChannelStreamOptionSchema = z
  .object({
    stream_id: z.string(),
    label: z.string().nullable().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    sample_count: z.number().nullable().optional(),
    last_timestamp: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
  })
  .passthrough();

export const HistoryPointSchema = z
  .object({
    timestamp: z.string(),
    value: z.number(),
    stream_id: z.string().nullable().optional(),
  })
  .passthrough();

export const TelemetryRecentResponseSchema = z
  .object({
    data: z.array(HistoryPointSchema),
    requested_since: z.string().nullable().optional(),
    requested_until: z.string().nullable().optional(),
    effective_since: z.string().nullable().optional(),
    effective_until: z.string().nullable().optional(),
    applied_time_filter: z.boolean().optional(),
    fallback_to_recent: z.boolean().optional(),
  })
  .passthrough();

export const OpsEventSchemaSchema = z
  .object({
    id: z.string(),
    source_id: z.string(),
    stream_id: z.string().nullable().optional(),
    event_time: z.string(),
    event_type: z.string(),
    severity: z.string(),
    summary: z.string(),
    entity_type: z.string(),
    entity_id: z.string().nullable().optional(),
    payload: UnknownRecordSchema.nullable().optional(),
    created_at: z.string(),
  })
  .passthrough();

export const ExplainResponseSchema = z
  .object({
    name: z.string().optional(),
    aliases: StringArraySchema.optional(),
    channel_origin: z.string().optional(),
    discovery_namespace: z.string().nullable().optional(),
    what_this_means: z.string(),
    llm_explanation: z.string(),
    what_to_check_next: z.array(
      z
        .object({
          name: z.string(),
          subsystem_tag: z.string(),
          link_reason: z.string(),
          current_value: z.number().nullable().optional(),
          current_status: z.string().nullable().optional(),
          last_timestamp: z.string().nullable().optional(),
          units: z.string().nullable().optional(),
        })
        .passthrough(),
    ),
    confidence_indicator: z.string().nullable().optional(),
  })
  .passthrough();

export const WatchlistResponseSchema = z.object({ entries: z.array(WatchlistEntrySchema).optional() }).passthrough();
export const TelemetryListResponseSchema = z
  .object({ channels: z.array(TelemetryListEntrySchema).optional(), names: StringArraySchema.optional() })
  .passthrough();
export const TelemetryInventoryResponseSchema = z.object({ channels: z.array(TelemetryInventoryEntrySchema).optional() }).passthrough();
export const SourceObservationsResponseSchema = z.object({ observations: z.array(SourceObservationSchema).optional() }).passthrough();
export const StringListResponseSchemas = {
  subsystems: z.object({ subsystems: StringArraySchema.optional() }).passthrough(),
  units: z.object({ units: StringArraySchema.optional() }).passthrough(),
};
export const TelemetrySearchResponseSchema = z.object({ results: z.array(SearchResultSchema).optional() }).passthrough();
export const TelemetryStreamsResponseSchema = z.object({ sources: z.array(TelemetryChannelStreamOptionSchema).optional() }).passthrough();
export const OpsEventsResponseSchema = z.object({ events: z.array(OpsEventSchemaSchema).optional(), total: z.number().optional() }).passthrough();
export const SimulatorActionResponseSchema = z.unknown();
export { SimulatorRuntimeStatusSchema };
