import { expect, type APIRequestContext } from "@playwright/test";

export const PLAYWRIGHT_API_URL =
  process.env.PLAYWRIGHT_API_URL || "http://platform-edge-proxy:8080";

const sleepMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Poll simulator health until `/simulator/status` reports reachable (`connected`).
 * Mirrors the UI gate for enabling Play; avoids racing a cold-managed simulator runtime.
 */
export async function waitForSimulatorReachableViaApi(
  request: APIRequestContext,
  sourceId: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const intervalMs = options?.intervalMs ?? 2_500;
  const deadline = Date.now() + timeoutMs;
  let lastSnap: unknown = null;

  while (Date.now() < deadline) {
    const url = `${PLAYWRIGHT_API_URL}/simulator/status?vehicle_id=${encodeURIComponent(sourceId)}`;
    const res = await request.get(url);

    if (res.ok()) {
      try {
        lastSnap = await res.json();
      } catch {
        lastSnap = { parseError: true };
      }
      const payload = lastSnap as { connected?: boolean } | null;
      if (
        typeof payload === "object"
        && payload !== null
        && payload.connected === true
      ) {
        return;
      }
    } else {
      lastSnap = { httpStatus: res.status() };
    }

    await sleepMs(intervalMs);
  }

  throw new Error(
    `Simulator unreachable (connected≠true) for vehicle_id=${sourceId} within ${timeoutMs}ms. Last snapshot: ${JSON.stringify(lastSnap)}`,
  );
}

/** Latest `/simulator/status` body for diagnostics. */
export async function fetchSimulatorStatusSnapshot(
  request: APIRequestContext,
  sourceId: string,
): Promise<{ ok: boolean; payload: unknown }> {
  const url = `${PLAYWRIGHT_API_URL}/simulator/status?vehicle_id=${encodeURIComponent(sourceId)}`;
  const res = await request.get(url);
  if (!res.ok()) {
    return { ok: false, payload: { httpStatus: res.status() } };
  }
  try {
    return { ok: true, payload: await res.json() };
  } catch {
    return { ok: true, payload: { parseError: true } };
  }
}

export interface TelemetrySource {
  id: string;
  name?: string;
  source_type?: string;
}

interface RegisterTelemetryChannelInput {
  sourceId: string;
  name: string;
  units?: string;
  description?: string;
  subsystemTag?: string;
}

interface IngestRealtimeSampleInput {
  sourceId: string;
  streamId: string;
  channelName?: string;
  value: number;
  receptionTime?: string;
  generationTime?: string;
  sequence?: number;
  tags?: Record<string, string>;
}

export async function getTelemetrySources(
  request: APIRequestContext,
): Promise<TelemetrySource[]> {
  const response = await request.get(`${PLAYWRIGHT_API_URL}/telemetry/sources`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as TelemetrySource[];
}

export async function getPreferredTelemetrySource(
  request: APIRequestContext,
  preferredType = "vehicle",
): Promise<TelemetrySource> {
  const sources = await getTelemetrySources(request);
  const source =
    sources.find((entry) => entry.source_type === preferredType) ?? sources[0];
  expect(source).toBeTruthy();
  return source!;
}

export async function registerTelemetryChannel(
  request: APIRequestContext,
  input: RegisterTelemetryChannelInput,
) {
  const response = await request.post(`${PLAYWRIGHT_API_URL}/telemetry/schema`, {
    data: {
      source_id: input.sourceId,
      name: input.name,
      units: input.units,
      description: input.description,
      subsystem_tag: input.subsystemTag,
    },
  });
  expect(response.ok()).toBeTruthy();
}

export async function ingestRealtimeSample(
  request: APIRequestContext,
  input: IngestRealtimeSampleInput,
) {
  const response = await request.post(
    `${PLAYWRIGHT_API_URL}/telemetry/realtime/ingest`,
    {
      data: {
        events: [
          {
            source_id: input.sourceId,
            stream_id: input.streamId,
            channel_name: input.channelName,
            value: input.value,
            reception_time: input.receptionTime,
            generation_time: input.generationTime,
            sequence: input.sequence ?? 1,
            tags: input.tags,
          },
        ],
      },
    },
  );

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { accepted?: number };
  expect(payload.accepted).toBe(1);
}
