import { expect, test } from "@playwright/test";
import { appUrl } from "./support/application-routes";
import { PLAYWRIGHT_API_URL, getPreferredTelemetrySource } from "./support/telemetry";

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

/**
 * End-to-end: simulator start → live feed → visible telemetry detail via the edge proxy URL.
 */
test("edge proxy: simulator yields live telemetry on channel detail @edge-proxy", async ({
  page,
  request,
}) => {
  const source = await getPreferredTelemetrySource(request, "simulator");
  const sourceId = source.id;

  const listResp = await request.get(
    `${PLAYWRIGHT_API_URL}/telemetry/list?source_id=${encodeURIComponent(sourceId)}`
  );
  expect(listResp.ok()).toBeTruthy();
  const listBody = (await listResp.json()) as { channels?: Array<{ name?: string }> };
  const channelName = (listBody.channels ?? [])
    .map((c) => c.name)
    .find((name): name is string => typeof name === "string" && name.length > 0);
  expect(channelName).toBeTruthy();

  await page.goto(`/apps/sources/simulator/${encodeURIComponent(sourceId)}`);
  await expect(page.getByTestId("simulator-panel")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("simulator-play-button")).toBeEnabled({ timeout: 90_000 });
  await page.getByTestId("simulator-play-button").click();

  await expect(page.getByTestId("simulator-panel").getByText("Running")).toBeVisible({
    timeout: 120_000,
  });

  await page.goto(appUrl("telemetry", [sourceId, channelName!]));

  await expect(page.getByTestId("telemetry-detail-live-badge")).toBeVisible({
    timeout: 120_000,
  });

  await expect(page.getByTestId("telemetry-feed-status")).toHaveAttribute(
    "data-feed-state",
    "connected",
    { timeout: 120_000 }
  );

  const stamp = page.locator("[data-last-timestamp]").first();
  const initial = await stamp.textContent();
  await expect
    .poll(async () => stamp.textContent(), { timeout: 120_000 })
    .not.toBe(initial);
});
