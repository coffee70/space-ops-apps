import { expect, test } from "@playwright/test";
import { appUrl } from "./support/application-routes";
import {
  PLAYWRIGHT_API_URL,
  getPreferredTelemetrySource,
  ingestRealtimeSample,
} from "./support/telemetry";

const CHANNEL_NAME = "decoder.aprs.payload_temp";

test.setTimeout(60_000);

test("telemetry inventory labels discovered channels", async ({ page, request }) => {
  const source = await getPreferredTelemetrySource(request);
  const streamId = `discovered-search-${Date.now()}`;

  await ingestRealtimeSample(request, {
    sourceId: source.id,
    streamId,
    generationTime: "2026-03-26T16:10:00Z",
    value: 41.25,
    tags: { decoder: "APRS", field_name: "Payload Temp" },
  });

  await expect
    .poll(async () => {
      const response = await request.get(
        `${PLAYWRIGHT_API_URL}/telemetry/list?source_id=${encodeURIComponent(source.id)}`,
      );
      const payload = (await response.json()) as {
        channels?: Array<{ name: string; channel_origin?: string }>;
      };
      return payload.channels?.find((channel) => channel.name === CHANNEL_NAME)?.channel_origin ?? null;
    })
    .toBe("discovered");

  await page.goto(appUrl("telemetry", [], { source: source.id }));
  await expect(page.getByRole("heading", { name: "Telemetry" })).toBeVisible();
  await expect(page.getByTestId("telemetry-inventory-search")).toBeVisible();

  const search = page.getByTestId("telemetry-inventory-search");
  await search.fill(CHANNEL_NAME);

  const row = page.getByRole("row").filter({
    has: page.getByText(CHANNEL_NAME, { exact: true }),
  }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("discovered");
});
