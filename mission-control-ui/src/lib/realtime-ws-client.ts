"use client";

import { resolvePublicApiUrl } from "@/lib/public-api-origin";
import { z } from "zod";

/**
 * Typed WebSocket client for realtime telemetry.
 * Reconnect with backoff, message validation, subscription manager.
 */

const DEFAULT_WS_PATH = "/telemetry/realtime/ws";

function getWsUrl(): string {
  if (typeof window === "undefined") {
    const origin = resolvePublicApiUrl();
    const wsBase =
      origin === ""
        ? "ws://127.0.0.1:3000"
        : origin.replace(/^http/, "ws");
    return `${wsBase}${DEFAULT_WS_PATH}`;
  }
  const origin = resolvePublicApiUrl();
  if (origin === "") {
    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${loc.host}${DEFAULT_WS_PATH}`;
  }
  const wsBase = origin.replace(/^http/, "ws");
  return `${wsBase}${DEFAULT_WS_PATH}`;
}

const SparklinePointSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
});

export const RealtimeChannelUpdateSchema = z.object({
  source_id: z.string(),
  stream_id: z.string(),
  name: z.string(),
  units: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  subsystem_tag: z.string(),
  current_value: z.number(),
  generation_time: z.string(),
  reception_time: z.string(),
  state: z.string(),
  state_reason: z.string().nullable().optional(),
  z_score: z.number().nullable().optional(),
  quality: z.string().optional(),
  sparkline_data: z.array(SparklinePointSchema),
});

export const TelemetryAlertSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  stream_id: z.string(),
  channel_name: z.string(),
  telemetry_id: z.string(),
  subsystem: z.string(),
  units: z.string().nullable().optional(),
  severity: z.string(),
  reason: z.string().nullable().optional(),
  status: z.string(),
  opened_at: z.string(),
  opened_reception_at: z.string(),
  last_update_at: z.string(),
  current_value: z.number(),
  red_low: z.number().nullable().optional(),
  red_high: z.number().nullable().optional(),
  z_score: z.number().nullable().optional(),
  acked_at: z.string().nullable().optional(),
  acked_by: z.string().nullable().optional(),
  cleared_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  resolved_by: z.string().nullable().optional(),
  resolution_text: z.string().nullable().optional(),
  resolution_code: z.string().nullable().optional(),
});

export const FeedStatusMessageSchema = z.object({
  type: z.literal("feed_status"),
  source_id: z.string(),
  connected: z.boolean(),
  state: z.enum(["connected", "degraded", "disconnected"]).optional(),
  last_reception_time: z.string().nullable(),
  approx_rate_hz: z.number().nullable().optional(),
});

export const OrbitStatusMessageSchema = z.object({
  type: z.literal("orbit_status"),
  vehicle_id: z.string(),
  status: z.string(),
  reason: z.string(),
  orbit_type: z.string().nullable().optional(),
  perigee_km: z.number().nullable().optional(),
  apogee_km: z.number().nullable().optional(),
  eccentricity: z.number().nullable().optional(),
  velocity_kms: z.number().nullable().optional(),
  period_sec: z.number().nullable().optional(),
});

export const RealtimeMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot_watchlist"), channels: z.array(RealtimeChannelUpdateSchema) }),
  z.object({ type: z.literal("telemetry_update"), channel: RealtimeChannelUpdateSchema }),
  z.object({ type: z.literal("snapshot_alerts"), active: z.array(TelemetryAlertSchema) }),
  z.object({ type: z.literal("alert_event"), event_type: z.string(), alert: TelemetryAlertSchema }),
  FeedStatusMessageSchema,
  OrbitStatusMessageSchema,
  z.object({ type: z.literal("hello_ack"), server_version: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);

export type RealtimeChannelUpdate = z.infer<typeof RealtimeChannelUpdateSchema>;
export type TelemetryAlert = z.infer<typeof TelemetryAlertSchema>;
export type OrbitStatusMessage = z.infer<typeof OrbitStatusMessageSchema>;
export type FeedStatusMessage = z.infer<typeof FeedStatusMessageSchema>;
export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;

export type RealtimeMessageHandler = (msg: RealtimeMessage) => void;

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export class RealtimeWsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<RealtimeMessageHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: {
    watchlist: string[];
    alerts: boolean;
    sourceId: string | null;
    streamId: string | null;
  } = { watchlist: [], alerts: true, sourceId: null, streamId: null };

  constructor(url?: string) {
    this.url = url || getWsUrl();
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.send({ type: "hello", client_version: "1.0" });
        if (this.subscriptions.sourceId) {
          this.send({
            type: "subscribe_watchlist",
            channels: this.subscriptions.watchlist,
            source_id: this.subscriptions.sourceId,
            ...(this.subscriptions.streamId
              ? { stream_id: this.subscriptions.streamId }
              : {}),
          });
          if (this.subscriptions.alerts) {
            this.send({
              type: "subscribe_alerts",
              source_id: this.subscriptions.sourceId,
              ...(this.subscriptions.streamId
                ? { stream_id: this.subscriptions.streamId }
                : {}),
            });
          }
        }
      };
      this.ws.onmessage = (ev) => {
        try {
          const parsed = RealtimeMessageSchema.safeParse(JSON.parse(String(ev.data)));
          if (!parsed.success) {
            console.error("Realtime message validation error:", parsed.error.issues);
            return;
          }
          const msg = parsed.data;
          this.handlers.forEach((h) => {
            try {
              h(msg);
            } catch (e) {
              console.error("Realtime handler error:", e);
            }
          });
        } catch (e) {
          console.error("Realtime parse error:", e);
        }
      };
      this.ws.onclose = () => {
        this.ws = null;
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        // Close will fire after error
      };
    } catch (e) {
      console.error("Realtime connect error:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      INITIAL_RECONNECT_MS * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_MS
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(handler: RealtimeMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  subscribeWatchlist(
    channels: string[],
    sourceId: string,
    streamId: string | null = null
  ): void {
    this.subscriptions.watchlist = channels;
    this.subscriptions.sourceId = sourceId;
    this.subscriptions.streamId = streamId;
    this.send({
      type: "subscribe_watchlist",
      channels,
      source_id: sourceId,
      ...(streamId ? { stream_id: streamId } : {}),
    });
  }

  subscribeAlerts(
    sourceId: string,
    streamId: string | null = null
  ): void {
    this.subscriptions.alerts = true;
    this.subscriptions.sourceId = sourceId;
    this.subscriptions.streamId = streamId;
    this.send({
      type: "subscribe_alerts",
      source_id: sourceId,
      ...(streamId ? { stream_id: streamId } : {}),
    });
  }

  ackAlert(alertId: string): void {
    this.send({ type: "ack_alert", alert_id: alertId });
  }

  resolveAlert(
    alertId: string,
    resolutionText: string,
    resolutionCode?: string
  ): void {
    this.send({
      type: "resolve_alert",
      alert_id: alertId,
      resolution_text: resolutionText,
      resolution_code: resolutionCode,
    });
  }

  private send(obj: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
