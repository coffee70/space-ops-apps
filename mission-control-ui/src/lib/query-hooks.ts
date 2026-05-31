"use client";

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  createConversation,
  getConversation,
  listConversations,
  listModels,
  updateConversation,
} from "@/applications/ai-engineer/lib/ai-engineer-client";
import type {
  AiEngineerConversationDetail,
  AiEngineerConversationSummary,
  ExecutionMode,
  ListAiEngineerModelsResponse,
} from "@/applications/ai-engineer/types";
import {
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
} from "@/applications/knowledge/lib/knowledge-client";
import type { KnowledgeDeleteResponse, KnowledgeDocument, KnowledgeUploadInput, KnowledgeUploadResponse } from "@/applications/knowledge/types";
import { auditLog } from "@/lib/audit-log";
import { fetchJson, fetchVoid, type ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SimulatorRuntimeStatus } from "@/lib/simulator-runtime";
import { fetchFeedStatus, type FeedStatus } from "@/lib/feed-status";
import { buildTelemetryApiBase } from "@/lib/telemetry-routes";
import {
  telemetryScopeKey,
  telemetryScopeToQueryParams,
  type TelemetryDetailScope,
} from "@/lib/telemetry-detail-scope";
import {
  AiEngineerModelConfigDocumentSchema,
  AiEngineerModelConfigSaveResponseSchema,
  AiEngineerModelConfigValidationResponseSchema,
  CodeRepositoryStatusSchema,
  ExplainResponseSchema,
  OpsEventsResponseSchema,
  SimulatorActionResponseSchema,
  SimulatorRuntimeStatusSchema,
  SourceObservationsResponseSchema,
  StringListResponseSchemas,
  SystemDeploymentOverviewResponseSchema,
  TelemetryInventoryResponseSchema,
  TelemetryListResponseSchema,
  TelemetryRecentResponseSchema,
  TelemetrySearchResponseSchema,
  TelemetrySourceSchema,
  TelemetryStreamsResponseSchema,
  VehicleConfigDocumentSchema,
  VehicleConfigListItemSchema,
  VehicleConfigSaveResponseSchema,
  VehicleConfigValidationResponseSchema,
  WatchlistResponseSchema,
  ActiveFrontendPreviewRuntimeResponseSchema,
  FrontendRuntimeStatusSchema,
  type ActiveFrontendPreviewRuntimeResponse,
  type FrontendRuntimeStatus,
} from "@/lib/ui-boundary-schemas";
import { z } from "zod";

export interface WatchlistEntry {
  name: string;
  aliases?: string[];
  display_order: number;
  channel_origin?: string;
  discovery_namespace?: string | null;
}

export interface TelemetryListEntry {
  name: string;
  aliases?: string[];
  channel_origin?: string;
  discovery_namespace?: string | null;
}

export interface TelemetryInventoryEntry {
  name: string;
  aliases: string[];
  description?: string | null;
  units?: string | null;
  subsystem_tag: string;
  channel_origin: string;
  discovery_namespace?: string | null;
  current_value?: number | null;
  last_timestamp?: string | null;
  state: string;
  state_reason?: string | null;
  z_score?: number | null;
  is_anomalous: boolean;
  has_data: boolean;
  red_low?: number | null;
  red_high?: number | null;
  n_samples?: number | null;
}

export interface TelemetrySource {
  id: string;
  name: string;
  description?: string | null;
  source_type?: string;
  base_url?: string | null;
  vehicle_config_path?: string;
}

export interface SourceObservation {
  id: string;
  source_id: string;
  external_id?: string | null;
  provider?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "missed";
  start_time: string;
  end_time: string;
  station_name?: string | null;
  station_id?: string | null;
  receiver_id?: string | null;
  max_elevation_deg?: number | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleConfigListItem {
  path: string;
  filename: string;
  name?: string | null;
  category: string;
  format: string;
  modified_at?: string | null;
}

export interface VehicleConfigParsedSummary {
  version: number;
  name?: string | null;
  channel_count: number;
  scenario_names: string[];
  has_position_mapping: boolean;
  has_ingestion: boolean;
}

export interface VehicleConfigValidationError {
  loc: string[];
  message: string;
  type: string;
}

export interface VehicleConfigDocument {
  path: string;
  content: string;
  format: string;
  parsed?: VehicleConfigParsedSummary | null;
  validation_errors: VehicleConfigValidationError[];
}

export interface AiEngineerModelConfigParsedSummary {
  provider_count: number;
  model_count: number;
  enabled_model_count: number;
  default_model_id?: string | null;
  provider_types: string[];
  missing_api_key_envs: string[];
  warnings?: string[];
}

export interface AiEngineerModelConfigValidationError {
  loc: string[];
  message: string;
  type: string;
}

export interface AiEngineerModelConfigDocument {
  path: string;
  content: string;
  format: "yaml";
  parsed?: AiEngineerModelConfigParsedSummary | null;
  validation_errors: AiEngineerModelConfigValidationError[];
}

export function applyAiEngineerGeneratedConversationTitle(
  queryClient: QueryClient,
  input: { conversationId: string; title: string; titleModelId?: string | null; updatedAt?: string },
) {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  queryClient.setQueryData<AiEngineerConversationDetail>(
    queryKeys.aiEngineerConversation(input.conversationId),
    (previous) => {
      if (!previous) return previous;
      if (previous.title_source === "manual") return previous;

      return {
        ...previous,
        title: input.title,
        title_source: "generated",
        title_model_id: input.titleModelId ?? null,
        updated_at: updatedAt,
      };
    },
  );
  queryClient.setQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations, (previous) =>
    (previous ?? []).map((conversation) => {
      if (conversation.id !== input.conversationId) return conversation;
      if (conversation.title_source === "manual") return conversation;

      return {
        ...conversation,
        title: input.title,
        title_source: "generated",
        title_model_id: input.titleModelId ?? null,
        updated_at: updatedAt,
      };
    }),
  );
}

export function useAiEngineerConversationsQuery() {
  return useQuery<AiEngineerConversationSummary[]>({
    queryKey: queryKeys.aiEngineerConversations,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    queryFn: async () => {
      const data = await listConversations();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useAiEngineerConversationQuery(conversationId: string | null, enabled = true) {
  return useQuery<AiEngineerConversationDetail>({
    queryKey: conversationId ? queryKeys.aiEngineerConversation(conversationId) : ["ai-engineer-conversation", "draft"],
    enabled: enabled && Boolean(conversationId),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    queryFn: async () => getConversation(conversationId!),
  });
}

export function useAiEngineerModelsQuery() {
  return useQuery<ListAiEngineerModelsResponse>({
    queryKey: queryKeys.aiEngineerModels,
    staleTime: 5 * 60 * 1000,
    queryFn: listModels,
  });
}

export function useCreateAiEngineerConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title?: string | null;
      mission_id?: string;
      vehicle_id?: string;
      execution_mode?: ExecutionMode;
      selected_model_id?: string | null;
      initial_message: { role: "user"; content: string; metadata?: Record<string, unknown> };
    }) => createConversation(payload),
    onSuccess: async (conversation) => {
      queryClient.setQueryData(queryKeys.aiEngineerConversation(conversation.id), conversation);
      queryClient.setQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations, (previous) => {
        const withoutCreated = (previous ?? []).filter((item) => item.id !== conversation.id);
        const summary: AiEngineerConversationSummary = {
          id: conversation.id,
          title: conversation.title,
          mission_id: conversation.mission_id,
          vehicle_id: conversation.vehicle_id,
          execution_mode: conversation.execution_mode,
          selected_model_id: conversation.selected_model_id,
          title_source: conversation.title_source,
          title_model_id: conversation.title_model_id,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        };
        return [summary, ...withoutCreated];
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversations });
    },
  });
}

export function useUpdateAiEngineerConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      patch,
    }: {
      conversationId: string;
      patch: { title?: string; execution_mode?: ExecutionMode; selected_model_id?: string | null };
    }) => updateConversation(conversationId, patch),
    onSuccess: async (conversation) => {
      queryClient.setQueryData(queryKeys.aiEngineerConversation(conversation.id), conversation);
      queryClient.setQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations, (previous) =>
        (previous ?? []).map((item) =>
          item.id === conversation.id
            ? {
                id: conversation.id,
                title: conversation.title,
                mission_id: conversation.mission_id,
                vehicle_id: conversation.vehicle_id,
                execution_mode: conversation.execution_mode,
                selected_model_id: conversation.selected_model_id,
                title_source: conversation.title_source,
                title_model_id: conversation.title_model_id,
                created_at: conversation.created_at,
                updated_at: conversation.updated_at,
              }
            : item,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerConversations });
    },
  });
}

export function useKnowledgeDocumentsQuery() {
  return useQuery<KnowledgeDocument[]>({
    queryKey: queryKeys.knowledgeDocuments,
    staleTime: 15 * 1000,
    queryFn: async ({ signal }) => listKnowledgeDocuments(signal),
    refetchInterval: (query) => {
      const documents = query.state.data;
      return Array.isArray(documents) && documents.some((document) => document.ingestion_status === "pending") ? 2500 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useUploadKnowledgeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation<KnowledgeUploadResponse, Error, KnowledgeUploadInput>({
    mutationFn: uploadKnowledgeDocument,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeDocuments });
    },
  });
}

export function useDeleteKnowledgeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation<KnowledgeDeleteResponse, Error, string>({
    mutationFn: deleteKnowledgeDocument,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeDocuments });
    },
  });
}

export type DeploymentUiState =
  | "healthy"
  | "deploying"
  | "stale"
  | "missing"
  | "failed"
  | "crashed"
  | "unknown"
  | "skipped"
  | "blocked";

export interface ServiceStatusItem {
  id: string;
  display_name: string;
  group: "core" | "runtime";
  expected: boolean;
  exists: boolean;
  ui_state: DeploymentUiState;
  health_status?: string | null;
  deployment_status?: string | null;
  bootstrap_status?: string | null;
  container_state?: string | null;
  container_status?: string | null;
  active_deployment_id?: string | null;
  latest_deployment_id?: string | null;
  service_slug?: string | null;
  runtime_kind?: string | null;
  runtime_template?: string | null;
  branch?: string | null;
  commit_sha?: string | null;
  updated_at?: string | null;
  last_checked_at?: string | null;
  failure_reason?: string | null;
  latest_error?: string | null;
  logs_url?: string | null;
  details: Record<string, unknown>;
}

export interface ServiceGroupSummary {
  expected_count: number;
  existing_count: number;
  healthy_count: number;
  warning_count: number;
  broken_count: number;
  missing_count: number;
  services: ServiceStatusItem[];
}

export interface BootstrapDependencyCycle {
  units: string[];
  path: string[];
}

export interface BootstrapBlockedDependencyIssue {
  unit_id: string;
  reason: string;
  blocking_units?: string[];
}

export interface BootstrapDependencyIssues {
  cycles: BootstrapDependencyCycle[];
  blocked_units: BootstrapBlockedDependencyIssue[];
  invalid_dependencies?: Record<string, unknown>[];
}

export interface BootstrapSummary {
  run_id?: number | null;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  failure_reason?: string | null;
  summary: Record<string, number>;
  dependency_issues?: BootstrapDependencyIssues | null;
}

export interface SystemDeploymentOverviewResponse {
  generated_at: string;
  overall_state: "healthy" | "degraded" | "broken" | "unknown";
  core: ServiceGroupSummary;
  runtime: ServiceGroupSummary;
  bootstrap?: BootstrapSummary | null;
}

export interface CodeRepositoryStatus {
  id: string;
  name: string;
  source_uri: string;
  layer: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  chunk_count: number;
  index_status: string;
  indexed_commit_sha?: string | null;
  current_commit_sha?: string | null;
  file_count: number;
  skipped_file_count: number;
  failed_file_count: number;
  last_error?: string | null;
  index_requested_at?: string | null;
  index_started_at?: string | null;
  index_completed_at?: string | null;
}

export interface CodeRepositoryStatusLookupResult {
  root: string;
  branch: string;
  status: CodeRepositoryStatus | null;
  notFound: boolean;
}

export function shouldPollCodeRepositoryStatus(status: CodeRepositoryStatus | null | undefined): boolean {
  if (!status) return true;
  if (status.index_status === "queued" || status.index_status === "indexing" || status.index_status === "not_indexed") return true;
  if (status.index_status === "ready") {
    if (status.chunk_count === 0) return true;
    if (status.indexed_commit_sha && status.current_commit_sha && status.indexed_commit_sha !== status.current_commit_sha) return true;
  }
  return false;
}

export interface SearchResult {
  name: string;
  aliases?: string[];
  match_confidence: number;
  description?: string | null;
  subsystem_tag?: string | null;
  units: string;
  channel_origin?: string;
  discovery_namespace?: string | null;
  current_value?: number | null;
  current_status?: string | null;
  last_timestamp?: string | null;
}

export interface TelemetryChannelStreamOption {
  stream_id: string;
  label?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  sample_count?: number | null;
  last_timestamp?: string | null;
  provider?: string | null;
  summary?: string | null;
}

export interface HistoryPoint {
  timestamp: string;
  value: number;
  stream_id?: string | null;
}

export interface TelemetryRecentResponse {
  data: HistoryPoint[];
  requested_since?: string | null;
  requested_until?: string | null;
  effective_since?: string | null;
  effective_until?: string | null;
  applied_time_filter?: boolean;
  fallback_to_recent?: boolean;
}

export interface OpsEventSchema {
  id: string;
  source_id: string;
  stream_id?: string | null;
  event_time: string;
  event_type: string;
  severity: string;
  summary: string;
  entity_type: string;
  entity_id?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
}

export interface ExplainResponse {
  name?: string;
  aliases?: string[];
  channel_origin?: string;
  discovery_namespace?: string | null;
  what_this_means: string;
  llm_explanation: string;
  what_to_check_next: {
    name: string;
    subsystem_tag: string;
    link_reason: string;
    current_value?: number | null;
    current_status?: string | null;
    last_timestamp?: string | null;
    units?: string | null;
  }[];
  confidence_indicator?: string | null;
}

interface SearchParams {
  q: string;
  sourceId: string;
  subsystem?: string;
  units?: string;
  anomalousOnly?: boolean;
  recentMinutes?: number;
}

interface SourceMutationInput {
  source_type: string;
  name: string;
  description?: string;
  base_url?: string;
  vehicle_config_path: string;
  monitoring_start_time?: string;
  history_mode?: "live_only" | "time_window_replay" | "cursor_replay";
}

interface SourceUpdateInput {
  sourceId: string;
  name: string;
  description?: string;
  base_url?: string;
  vehicle_config_path?: string;
  monitoring_start_time?: string;
  history_mode?: "live_only" | "time_window_replay" | "cursor_replay";
}

interface VehicleConfigValidateInput {
  content: string;
  path?: string;
  filename?: string;
  format?: string;
}

interface VehicleConfigSaveInput {
  path: string;
  content: string;
}

interface SimulatorActionInput {
  sourceId: string;
  scenario?: string;
  duration?: number;
  speed?: number;
  drop_prob?: number;
  jitter?: number;
}

function toSearchQueryParams(params: SearchParams): URLSearchParams {
  const query = new URLSearchParams({ q: params.q.trim(), source_id: params.sourceId });
  if (params.subsystem) query.set("subsystem", params.subsystem);
  if (params.units) query.set("units", params.units);
  if (params.anomalousOnly) query.set("anomalous_only", "true");
  if (params.recentMinutes && params.recentMinutes > 0) {
    query.set("recent_minutes", String(params.recentMinutes));
  }
  return query;
}

function encodePathSegments(path: string): string {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function useFeedStatusQuery(sourceId: string, enabled = true) {
  return useQuery<FeedStatus>({
    queryKey: queryKeys.feedStatus(sourceId),
    enabled: enabled && sourceId.length > 0,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => fetchFeedStatus(sourceId, { signal }),
  });
}

export function useWatchlistQuery(sourceId: string, enabled = true) {
  return useQuery<WatchlistEntry[]>({
    queryKey: queryKeys.watchlist(sourceId),
    enabled,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `/telemetry/watchlist?source_id=${encodeURIComponent(sourceId)}`,
        {
        signal,
        },
        WatchlistResponseSchema
      );
      return data.entries ?? [];
    },
  });
}

export function useWatchlistNames(sourceId: string, enabled = true) {
  const watchlistQuery = useWatchlistQuery(sourceId, enabled);
  return {
    ...watchlistQuery,
    names: (watchlistQuery.data ?? []).map((entry) => entry.name),
  };
}

export function useAddToWatchlistMutation(
  sourceId: string,
  options?: { onSuccess?: () => void | Promise<void> }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      fetchJson("/telemetry/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId, telemetry_name: name }),
      }),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist(sourceId) });
      const previous = queryClient.getQueryData<WatchlistEntry[]>(queryKeys.watchlist(sourceId)) ?? [];
      if (!previous.some((entry) => entry.name === name)) {
        queryClient.setQueryData<WatchlistEntry[]>(queryKeys.watchlist(sourceId), [
          ...previous,
          { name, display_order: previous.length },
        ]);
      }
      return { previous, name };
    },
    onError: (_error, name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.watchlist(sourceId), context.previous);
      }
      auditLog("watchlist.add", { source_id: sourceId, telemetry_name: name, error: "Failed to add" });
    },
    onSuccess: async (_data, name) => {
      auditLog("watchlist.add", { source_id: sourceId, telemetry_name: name });
      await options?.onSuccess?.();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(sourceId) });
    },
  });
}

export function useRemoveFromWatchlistMutation(
  sourceId: string,
  options?: { onSuccess?: () => void | Promise<void> }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      fetchVoid(`/telemetry/watchlist/${encodeURIComponent(name)}?source_id=${encodeURIComponent(sourceId)}`, {
        method: "DELETE",
      }),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist(sourceId) });
      const previous = queryClient.getQueryData<WatchlistEntry[]>(queryKeys.watchlist(sourceId)) ?? [];
      queryClient.setQueryData<WatchlistEntry[]>(
        queryKeys.watchlist(sourceId),
        previous.filter((entry) => entry.name !== name)
      );
      return { previous, name };
    },
    onError: (_error, name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.watchlist(sourceId), context.previous);
      }
      auditLog("watchlist.remove", { source_id: sourceId, name, error: "Failed to remove" });
    },
    onSuccess: async (_data, name) => {
      auditLog("watchlist.remove", { source_id: sourceId, name });
      await options?.onSuccess?.();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(sourceId) });
    },
  });
}

export function useTelemetryListQuery(sourceId: string, enabled = true) {
  return useQuery<TelemetryListEntry[]>({
    queryKey: queryKeys.telemetryList(sourceId),
    enabled,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `/telemetry/list?source_id=${encodeURIComponent(sourceId)}`,
        {
        signal,
        },
        TelemetryListResponseSchema
      );
      if (data.channels) return data.channels;
      if (data.names) {
        return data.names.map((name) => ({ name, channel_origin: "catalog", discovery_namespace: null }));
      }
      return [];
    },
  });
}

export function useTelemetryInventoryQuery(sourceId: string, enabled = true) {
  return useQuery<TelemetryInventoryEntry[]>({
    queryKey: queryKeys.telemetryInventory(sourceId),
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: enabled ? 4000 : false,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `/telemetry/inventory?source_id=${encodeURIComponent(sourceId)}`,
        { signal, cache: "no-store" },
        TelemetryInventoryResponseSchema
      );
      return data.channels ?? [];
    },
  });
}

export function useTelemetrySourcesQuery<T = TelemetrySource[]>(
  options?: Omit<UseQueryOptions<TelemetrySource[], Error, T>, "queryKey" | "queryFn">
) {
  return useQuery<TelemetrySource[], Error, T>({
    queryKey: queryKeys.telemetrySources,
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson("/telemetry/sources", {
        signal,
        useFallback: true,
        cache: "no-store",
      }, z.array(TelemetrySourceSchema));
      return data;
    },
    ...(options ?? {}),
  });
}

export function useCreateTelemetrySourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SourceMutationInput) =>
      fetchJson("/telemetry/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }, TelemetrySourceSchema),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.telemetrySources });
    },
  });
}

export function useUpdateTelemetrySourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, ...input }: SourceUpdateInput) =>
      fetchJson(`/telemetry/sources/${encodeURIComponent(sourceId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }, TelemetrySourceSchema),
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.telemetrySources });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.telemetrySourcesStatus(variables.sourceId),
      });
    },
  });
}

export function useUpcomingObservationsQuery(sourceId: string | null | undefined, limit = 5) {
  return useQuery<SourceObservation[]>({
    queryKey: queryKeys.sourceObservations(sourceId ?? "", limit),
    enabled: Boolean(sourceId),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `/telemetry/sources/${encodeURIComponent(sourceId ?? "")}/observations/upcoming?limit=${limit}`,
        { signal, cache: "no-store" },
        SourceObservationsResponseSchema
      );
      return data.observations ?? [];
    },
  });
}

export function useVehicleConfigsQuery(enabled = true) {
  return useQuery<VehicleConfigListItem[]>({
    queryKey: queryKeys.vehicleConfigs,
    enabled,
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson("/vehicle-configs", {
        signal,
        cache: "no-store",
      }, z.array(VehicleConfigListItemSchema));
      return data;
    },
  });
}

export function useVehicleConfigQuery(path: string, enabled = true) {
  return useQuery<VehicleConfigDocument>({
    queryKey: queryKeys.vehicleConfig(path),
    enabled: enabled && path.trim().length > 0,
    placeholderData: (previousData) => previousData,
    queryFn: async ({ signal }) =>
      fetchJson(`/vehicle-configs/${encodePathSegments(path)}`, {
        signal,
        cache: "no-store",
      }, VehicleConfigDocumentSchema),
  });
}

export function useValidateVehicleConfigMutation() {
  return useMutation({
    mutationFn: async (input: VehicleConfigValidateInput) =>
      fetchJson("/vehicle-configs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }, VehicleConfigValidationResponseSchema),
  });
}

export function useCreateVehicleConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VehicleConfigSaveInput) =>
      fetchJson("/vehicle-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }, VehicleConfigSaveResponseSchema),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicleConfigs });
    },
  });
}

export function useUpdateVehicleConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VehicleConfigSaveInput) =>
      fetchJson(
        `/vehicle-configs/${encodePathSegments(input.path)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        VehicleConfigSaveResponseSchema
      ),
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicleConfigs });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicleConfig(variables.path) });
    },
  });
}

export function useAiEngineerModelConfigQuery(enabled = true) {
  return useQuery<AiEngineerModelConfigDocument>({
    queryKey: queryKeys.aiEngineerModelConfig,
    enabled,
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) =>
      fetchJson("/intelligence/agent/model-config", { signal, cache: "no-store" }, AiEngineerModelConfigDocumentSchema),
  });
}

function isBootstrapRunning(data?: SystemDeploymentOverviewResponse) {
  return data?.bootstrap?.status === "running";
}

export function useDeploymentOverviewQuery() {
  return useQuery<SystemDeploymentOverviewResponse>({
    queryKey: queryKeys.deploymentOverview,
    refetchInterval: (query) => (isBootstrapRunning(query.state.data) ? 1000 : 2000),
    refetchIntervalInBackground: true,
    queryFn: async ({ signal }) =>
      fetchJson("/system/deployments/overview", {
        signal,
        cache: "no-store",
        useFallback: true,
      }, SystemDeploymentOverviewResponseSchema),
  });
}

export function useActiveFrontendPreviewRuntimeQuery() {
  return useQuery<ActiveFrontendPreviewRuntimeResponse>({
    queryKey: queryKeys.activeFrontendPreviewRuntime,
    staleTime: 0,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) =>
      fetchJson(
        "/registry/frontend-runtime/preview-context",
        { signal, cache: "no-store", useFallback: true },
        ActiveFrontendPreviewRuntimeResponseSchema as z.ZodType<ActiveFrontendPreviewRuntimeResponse>,
      ),
  });
}

export async function fetchFrontendRuntimeStatus(signal?: AbortSignal): Promise<FrontendRuntimeStatus> {
  return fetchJson(
    "/registry/frontend-runtime/status",
    { signal, cache: "no-store", useFallback: true },
    FrontendRuntimeStatusSchema as z.ZodType<FrontendRuntimeStatus>,
  );
}

function isFrontendRuntimeTransitioning(data?: FrontendRuntimeStatus) {
  return data?.effective_state === "preview_deploying" || data?.effective_state === "baseline_reverting";
}

export function useFrontendRuntimeStatusQuery() {
  return useQuery<FrontendRuntimeStatus>({
    queryKey: queryKeys.frontendRuntimeStatus,
    staleTime: 0,
    refetchInterval: (query) => (isFrontendRuntimeTransitioning(query.state.data) ? 1500 : 5000),
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => fetchFrontendRuntimeStatus(signal),
  });
}

function isNotFoundError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error && (error as ApiError).status === 404;
}

export function useCodeRepositoryStatusQueries(repositories: readonly { root: string; branch: string }[]) {
  return useQueries({
    queries: repositories.map((repository) => ({
      queryKey: queryKeys.codeRepositoryStatus(repository.root, repository.branch),
      staleTime: 15 * 1000,
      refetchInterval: (query: { state: { data?: CodeRepositoryStatusLookupResult; error: unknown } }) =>
        query.state.error ? false : shouldPollCodeRepositoryStatus(query.state.data?.status) ? 2500 : false,
      refetchIntervalInBackground: false,
      queryFn: async ({ signal }): Promise<CodeRepositoryStatusLookupResult> => {
        try {
          const status = await fetchJson(
            `/intelligence/code/repositories/status?root=${encodeURIComponent(repository.root)}&branch=${encodeURIComponent(repository.branch)}`,
            { signal, cache: "no-store", useFallback: true },
            CodeRepositoryStatusSchema,
          );
          return { ...repository, status, notFound: false };
        } catch (error) {
          if (isNotFoundError(error)) {
            return { ...repository, status: null, notFound: true };
          }
          throw error;
        }
      },
    })),
  });
}

export function useValidateAiEngineerModelConfigMutation() {
  return useMutation({
    mutationFn: async (content: string) =>
      fetchJson("/intelligence/agent/model-config/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }, AiEngineerModelConfigValidationResponseSchema),
  });
}

export function useUpdateAiEngineerModelConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      fetchJson(
        "/intelligence/agent/model-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
        AiEngineerModelConfigSaveResponseSchema,
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiEngineerModelConfig });
    },
  });
}

export function useTelemetrySubsystemsQuery(sourceId: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: queryKeys.subsystems(sourceId),
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(`/telemetry/subsystems?source_id=${encodeURIComponent(sourceId)}`, {
        signal,
      }, StringListResponseSchemas.subsystems);
      return data.subsystems ?? [];
    },
  });
}

export function useTelemetryUnitsQuery(sourceId: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: queryKeys.units(sourceId),
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `/telemetry/units?source_id=${encodeURIComponent(sourceId)}`,
        { signal },
        StringListResponseSchemas.units
      );
      return data.units ?? [];
    },
  });
}

export function useTelemetrySearchQuery(params: SearchParams, enabled: boolean) {
  const queryParams = toSearchQueryParams(params);
  return useQuery<SearchResult[]>({
    queryKey: queryKeys.telemetrySearch(Object.fromEntries(queryParams.entries())),
    enabled: enabled && params.q.trim().length > 0,
    staleTime: 30 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `/telemetry/search?${queryParams.toString()}`,
        { signal },
        TelemetrySearchResponseSchema
      );
      return data.results ?? [];
    },
  });
}

export function useTelemetryChannelStreamsQuery(channelName: string, sourceId: string, enabled = true) {
  return useQuery<TelemetryChannelStreamOption[]>({
    queryKey: queryKeys.telemetryChannelRuns(channelName, sourceId),
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const data = await fetchJson(
        `${buildTelemetryApiBase(sourceId, channelName)}/streams`,
        { signal },
        TelemetryStreamsResponseSchema
      );
      return data.sources ?? [];
    },
  });
}

export function useTelemetryRecentQuery(
  params: Record<string, string>,
  enabled = true
) {
  const queryEntries = Object.entries(params).filter(
    ([key]) => key !== "channelName" && key !== "catalogSourceId"
  );
  return useQuery<TelemetryRecentResponse>({
    queryKey: queryKeys.telemetryRecent(params),
    enabled,
    queryFn: async ({ signal }) =>
      fetchJson(
        `${buildTelemetryApiBase(params.catalogSourceId ?? params.source_id, params.channelName)}/recent?${new URLSearchParams(
          queryEntries
        ).toString()}`,
        { signal },
        TelemetryRecentResponseSchema
      ),
  });
}

export function useTelemetryScopedRecentQuery(
  channelName: string,
  sourceId: string,
  scope: TelemetryDetailScope,
  limit = "500",
  enabled = true
) {
  const pollLiveLatest = enabled && scope.mode === "latest";
  const queryParams = telemetryScopeToQueryParams(scope);
  queryParams.set("limit", limit);
  const queryKey = {
    channelName,
    sourceId,
    scope: telemetryScopeKey(scope),
    limit,
  };
  return useQuery<TelemetryRecentResponse>({
    queryKey: queryKeys.telemetryRecent(queryKey),
    enabled,
    refetchInterval: pollLiveLatest ? 4000 : false,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) =>
      fetchJson(
        `${buildTelemetryApiBase(sourceId, channelName)}/recent?${queryParams.toString()}`,
        { signal },
        TelemetryRecentResponseSchema
      ),
  });
}

export function useTelemetryExplanationQuery(
  channelName: string,
  sourceId: string,
  scope: TelemetryDetailScope,
  enabled = true
) {
  const params = telemetryScopeToQueryParams(scope);
  return useQuery<ExplainResponse>({
    queryKey: queryKeys.telemetryExplanation(channelName, sourceId, telemetryScopeKey(scope)),
    enabled,
    retry: 0,
    queryFn: async ({ signal }) =>
      fetchJson(
        `${buildTelemetryApiBase(sourceId, channelName)}/explain?${params.toString()}`,
        { signal, cache: "no-store" },
        ExplainResponseSchema
      ),
  });
}

export function useTelemetryScopedEventsQuery(
  channelName: string,
  sourceId: string,
  scope: TelemetryDetailScope,
  limit = "20",
  enabled = true
) {
  const queryParams = telemetryScopeToQueryParams(scope);
  queryParams.set("source_id", sourceId);
  queryParams.set("channel_name", channelName);
  queryParams.set("limit", limit);
  if (scope.mode === "latest") {
    queryParams.set("since_minutes", "60");
  }
  return useOpsEventsQuery(queryParams, enabled);
}

export function useOpsEventsQuery(params: Record<string, string> | URLSearchParams, enabled = true) {
  const key = params instanceof URLSearchParams ? params.toString() : params;
  return useQuery<{ events: OpsEventSchema[]; total: number }>({
    queryKey: queryKeys.telemetryEvents(key),
    enabled,
    staleTime: 15 * 1000,
    queryFn: async ({ signal }) => {
      const query = params instanceof URLSearchParams ? params : new URLSearchParams(params);
      const data = await fetchJson(
        `/ops/events?${query.toString()}`,
        { signal },
        OpsEventsResponseSchema
      );
      return {
        events: data.events ?? [],
        total: data.total ?? 0,
      };
    },
  });
}

export async function fetchSimulatorRuntimeStatus(sourceId: string): Promise<SimulatorRuntimeStatus> {
  const data = await fetchJson(
    `/simulator/status?vehicle_id=${encodeURIComponent(sourceId)}`,
    { cache: "no-store", useFallback: true },
    SimulatorRuntimeStatusSchema
  );
  return data ?? { connected: false };
}

export function useSimulatorStatusQuery(
  sourceId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    initialData?: SimulatorRuntimeStatus | null;
  }
) {
  const query = useQuery<SimulatorRuntimeStatus>({
    queryKey: queryKeys.telemetrySourcesStatus(sourceId),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    initialData: options?.initialData ?? undefined,
    queryFn: async () => fetchSimulatorRuntimeStatus(sourceId),
  });

  if (query.isError) {
    return {
      ...query,
      data: { connected: false } as SimulatorRuntimeStatus,
    };
  }

  return query;
}

export function useSimulatorStatusesMap(sourceIds: string[], enabled = true, refetchInterval = 5000) {
  const results = useQueries({
    queries: sourceIds.map((sourceId) => ({
      queryKey: queryKeys.telemetrySourcesStatus(sourceId),
      enabled,
      refetchInterval,
      queryFn: async () => fetchSimulatorRuntimeStatus(sourceId),
    })),
  });

  return sourceIds.reduce<Record<string, SimulatorRuntimeStatus>>((acc, sourceId, index) => {
    const result = results[index];
    const data = result?.isError ? ({ connected: false } as SimulatorRuntimeStatus) : result?.data;
    if (data) {
      acc[sourceId] = data;
    }
    return acc;
  }, {});
}

function invalidateSimulatorStatus(queryClient: ReturnType<typeof useQueryClient>, sourceId: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.telemetrySourcesStatus(sourceId) });
}

export function useSimulatorStartMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, ...payload }: SimulatorActionInput) =>
      fetchJson("/simulator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, vehicle_id: sourceId }),
        useFallback: true,
      }, SimulatorActionResponseSchema),
    onSettled: async (_data, _error, variables) => {
      await invalidateSimulatorStatus(queryClient, variables.sourceId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.telemetrySources });
    },
  });
}

function createSimulatorActionMutation(path: string, actionName: string) {
  return function useAction() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ sourceId }: SimulatorActionInput) =>
        fetchJson(
          `${path}?vehicle_id=${encodeURIComponent(sourceId)}`,
          { method: "POST", useFallback: true },
          SimulatorActionResponseSchema
        ),
      onSuccess: (_data, variables) => {
        auditLog(actionName);
        return invalidateSimulatorStatus(queryClient, variables.sourceId);
      },
      onSettled: async (_data, _error, variables) => {
        await invalidateSimulatorStatus(queryClient, variables.sourceId);
      },
    });
  };
}

export const useSimulatorPauseMutation = createSimulatorActionMutation("/simulator/pause", "simulator.pause");
export const useSimulatorResumeMutation = createSimulatorActionMutation("/simulator/resume", "simulator.resume");
export const useSimulatorStopMutation = createSimulatorActionMutation("/simulator/stop", "simulator.stop");
