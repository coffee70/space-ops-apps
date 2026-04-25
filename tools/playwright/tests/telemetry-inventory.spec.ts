import { expect, test } from "@playwright/test";
import { appUrl, escapeRegExp } from "./support/application-routes";
import {
  getPreferredTelemetrySource,
  getTelemetrySources,
  registerTelemetryChannel,
} from "./support/telemetry";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

test("telemetry inventory supports browsing, routing, and watchlist toggles", async ({
  page,
  request,
}) => {
  const source = await getPreferredTelemetrySource(request);

  const channelName = `INV_ROUTE_${Date.now()}`;
  await registerTelemetryChannel(request, {
    sourceId: source.id,
    name: channelName,
    units: "V",
    description: "Inventory route test channel",
    subsystemTag: "power",
  });

  await page.goto(appUrl("telemetry", [], { source: source.id }));
  await expect(page.getByRole("heading", { name: "Telemetry" })).toBeVisible();
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Telemetry");

  const search = page.getByLabel("Search");
  await search.fill(channelName);
  await expect(page.getByText(channelName)).toBeVisible();

  const addButton = page.getByRole("button", { name: `Add ${channelName} to watchlist` });
  await addButton.click();
  await expect(page.getByRole("button", { name: `Remove ${channelName} from watchlist` })).toBeVisible();

  await page.getByText(channelName).click();
  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(appUrl("telemetry", [source.id, channelName]))}(\\?view=analysis)?$`,
    ),
  );
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Telemetry");
  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Telemetry");

  await page.goto(appUrl("telemetry", [], { source: source.id }));
  await search.fill(channelName);
  const removeButton = page.getByRole("button", { name: `Remove ${channelName} from watchlist` });
  await removeButton.click();
  await expect(page.getByRole("button", { name: `Add ${channelName} to watchlist` })).toBeVisible();
});

test("telemetry inventory redirects unavailable channels back to telemetry root", async ({
  page,
  request,
}) => {
  const sources = await getTelemetrySources(request);
  const source = sources[0];
  expect(source).toBeTruthy();
  if (!source) return;

  const missingChannel = `MISSING_${Date.now()}`;
  await page.goto(appUrl("telemetry", [source.id, missingChannel]));
  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(
        appUrl("telemetry", [], {
          source: source.id,
          channel_unavailable: missingChannel,
        }),
      )}$`,
    ),
  );
  await expect(page.getByText(`${missingChannel} is not available for this source.`)).toBeVisible();
});
