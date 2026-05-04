import { expect, type APIRequestContext } from "@playwright/test";

export const PLAYWRIGHT_API_URL =
  process.env.PLAYWRIGHT_API_URL || "http://platform-api:8000";

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
