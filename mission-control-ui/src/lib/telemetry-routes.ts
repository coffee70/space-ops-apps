import {
  telemetryScopeToQueryParams,
  type TelemetryDetailScope,
} from "@/lib/telemetry-detail-scope";
import { buildApplicationRouteWithQuery } from "@/platform/registry/application-routes";

/** Sidebar / URL tab for telemetry channel detail. */
export type TelemetryDetailView = "analysis" | "summary" | "explanation";

export function parseTelemetryDetailView(
  params: Record<string, string | string[] | undefined>,
): TelemetryDetailView {
  const raw = params.view;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "summary") return "summary";
  if (v === "explanation") return "explanation";
  return "analysis";
}

export function buildTelemetryDetailHref(
  sourceId: string,
  channelName: string,
  scope?: TelemetryDetailScope,
  view: TelemetryDetailView = "analysis",
): string {
  const params = scope ? telemetryScopeToQueryParams(scope) : new URLSearchParams();
  params.set("view", view);
  return buildApplicationRouteWithQuery("telemetry", [sourceId, channelName], params);
}

export function buildTelemetryApiBase(sourceId: string, channelName: string): string {
  return `/telemetry/sources/${encodeURIComponent(sourceId)}/channels/${encodeURIComponent(channelName)}`;
}
