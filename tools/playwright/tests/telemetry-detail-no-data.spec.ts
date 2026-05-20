import { expect, test } from "@playwright/test";
import { appUrl, escapeRegExp } from "./support/application-routes";
import {
  getPreferredTelemetrySource,
  registerTelemetryChannel,
} from "./support/telemetry";

test.setTimeout(90_000);

test("registered channel detail renders when no samples or statistics exist", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 900, height: 420 });
  const source = await getPreferredTelemetrySource(request);

  const channelName = `NO_DATA_DETAIL_${Date.now()}`;
  await registerTelemetryChannel(request, {
    sourceId: source.id,
    name: channelName,
    units: "deg",
    description: "Registered channel with no samples",
  });

  await page.goto(appUrl("telemetry", [source.id, channelName]));

  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(appUrl("telemetry", [source.id, channelName]))}(?:\\?scope=latest&view=analysis)?$`,
    ),
  );
  const detailHeader = page.locator("header").filter({
    has: page.getByRole("heading", { name: new RegExp(channelName) }),
  });

  await expect(page.getByRole("heading", { name: new RegExp(channelName) })).toBeVisible();
  await expect(detailHeader).toHaveCSS("position", "sticky");
  await expect(detailHeader).toHaveCSS("top", "0px");
  await expect(page.locator("header [data-value='']")).toContainText("No data");
  const scrollRoot = page.getByTestId("telemetry-detail-scroll-root");
  await expect(scrollRoot).toHaveCSS("overflow-y", "auto");
  const metrics = await scrollRoot.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await scrollRoot.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Summary" }).click();
  await expect(
    page.getByText(
      "No statistics yet. This channel is registered, but no samples have been received.",
    ),
  ).toBeVisible();
});
