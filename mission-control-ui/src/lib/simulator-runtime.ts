"use client";

import { useMemo } from "react";
import { resolvePublicApiUrl } from "@/lib/public-api-origin";
import { useSimulatorStatusQuery } from "@/lib/query-hooks";
import { SimulatorRuntimeStatusSchema } from "@/lib/simulator-schemas";

export interface SimulatorRuntimeStatus {
  connected: boolean;
  supported_scenarios?: {
    name: string;
    description: string;
  }[];
  state?: "idle" | "running" | "paused";
  config?: {
    scenario: string;
    duration: number;
    speed: number;
    drop_prob: number;
    jitter: number;
    vehicle_id: string;
    stream_id: string;
    packet_source?: string | null;
    receiver_id?: string | null;
    base_url: string;
  } | null;
  sim_elapsed?: number;
}

export interface SimulatorRuntimeState {
  status: SimulatorRuntimeStatus | null;
  activeStreamId: string | null;
  isActive: boolean;
}

interface UseSimulatorRuntimeOptions {
  sourceId: string;
  enabled: boolean;
  pollMs?: number;
  initialStatus?: SimulatorRuntimeStatus | null;
}

function toRuntimeState(
  status: SimulatorRuntimeStatus | null
): SimulatorRuntimeState {
  const isActive =
    status?.connected === true &&
    status.state != null &&
    status.state !== "idle";
  const activeStreamId = isActive ? status?.config?.stream_id ?? null : null;
  return {
    status,
    activeStreamId,
    isActive,
  };
}

export async function fetchSimulatorRuntimeStatus(
  sourceId: string
): Promise<SimulatorRuntimeStatus> {
  const base = resolvePublicApiUrl();
  const response = await fetch(
    `${base}/simulator/status?vehicle_id=${encodeURIComponent(sourceId)}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    return { connected: false };
  }
  const parsed = SimulatorRuntimeStatusSchema.safeParse(await response.json());
  if (!parsed.success) {
    console.error("Simulator runtime status validation error:", parsed.error.issues);
    return { connected: false };
  }
  return parsed.data;
}

export function useSimulatorRuntime({
  sourceId,
  enabled,
  pollMs = 2000,
  initialStatus = null,
}: UseSimulatorRuntimeOptions): SimulatorRuntimeState & {
  refresh: () => Promise<void>;
} {
  const initialState = useMemo(() => toRuntimeState(enabled ? initialStatus : null), [enabled, initialStatus]);
  const statusQuery = useSimulatorStatusQuery(sourceId, {
    enabled,
    refetchInterval: pollMs,
    initialData: initialStatus,
  });
  const runtime = enabled ? toRuntimeState(statusQuery.data ?? { connected: false }) : initialState;

  return {
    ...runtime,
    refresh: async () => {
      await statusQuery.refetch();
    },
  };
}
