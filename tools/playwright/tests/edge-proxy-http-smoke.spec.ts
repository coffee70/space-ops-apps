import { expect, test } from "@playwright/test";

/**
 * Proves broad route families reach the platform API gateway and control plane through
 * the Layer 1 edge proxy (not raw platform-api:8000).
 */
test("edge proxy GET route families @smoke @edge-proxy", async ({ request }) => {
  const sourcesResp = await request.get("/telemetry/sources");
  expect(sourcesResp.ok()).toBeTruthy();
  const sources = (await sourcesResp.json()) as Array<{ id?: string; source_type?: string }>;
  expect(Array.isArray(sources)).toBeTruthy();

  const registryResp = await request.get("/registry/applications");
  expect(registryResp.ok()).toBeTruthy();

  const firstSourceId = sources.find((s) => s.id)?.id;
  expect(firstSourceId).toBeTruthy();
  const feedResp = await request.get(
    `/ops/feed-status?source_id=${encodeURIComponent(firstSourceId!)}`
  );
  expect(feedResp.ok()).toBeTruthy();

  const simSource = sources.find((s) => s.source_type === "simulator");
  if (simSource?.id) {
    const statusResp = await request.get(
      `/simulator/status?vehicle_id=${encodeURIComponent(simSource.id)}`
    );
    expect(statusResp.ok()).toBeTruthy();
  }
});

test("edge proxy matches direct platform list for telemetry sources @edge-proxy", async ({
  request,
}) => {
  const viaEdge = await request.get("/telemetry/sources");
  expect(viaEdge.ok()).toBeTruthy();
  const edgePayload = await viaEdge.json();

  const directUrl =
    process.env.PLAYWRIGHT_PLATFORM_API_URL || "http://platform-api:8000";
  const direct = await request.get(`${directUrl}/telemetry/sources`);
  expect(direct.ok()).toBeTruthy();
  const directPayload = await direct.json();

  expect(edgePayload).toEqual(directPayload);
});
