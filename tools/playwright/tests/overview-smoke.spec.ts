import { expect, test, type Locator } from "@playwright/test";
import { appUrl } from "./support/application-routes";

async function expectScrollable(locator: Locator) {
  await expect(locator).toHaveCSS("overflow-y", "auto");
  const metrics = await locator.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await locator.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => locator.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
}

test("home redirects to the overview application shell @smoke", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/apps\/overview$/);
  await expect(
    page.getByRole("heading", { name: "Operator Overview" })
  ).toBeVisible();
  await expect(page.getByText("Loading overview…")).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("applications-nav-item")).toBeVisible();
  await expect(page.getByTestId("current-application-nav-item")).toContainText(
    "Overview"
  );
  await expect(page.locator("main")).toBeVisible();
});

test("overview content scrolls inside the native application host @smoke", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 420 });
  await page.route("**/telemetry/sources", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "sim-source",
          name: "Simulator Source",
          source_type: "simulator",
        },
      ]),
    });
  });
  await page.route("**/telemetry/sources/sim-source/streams", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sources: [{ stream_id: "stream-1" }] }),
    });
  });
  await page.route("**/simulator/status?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connected: true,
        state: "idle",
        supported_scenarios: [],
      }),
    });
  });
  await page.route("**/telemetry/overview?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        channels: Array.from({ length: 12 }, (_, index) => ({
          name: `PWR_CHANNEL_${index}`,
          units: "V",
          description: null,
          subsystem_tag: "power",
          current_value: 3.3 + index,
          last_timestamp: "2026-05-12T12:00:00Z",
          state: "nominal",
          state_reason: null,
          z_score: 0,
          sparkline_data: [],
        })),
      }),
    });
  });
  await page.route("**/telemetry/anomalies?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ power: [], thermal: [], adcs: [], comms: [], other: [] }),
    });
  });
  await page.route("**/telemetry/watchlist?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        entries: Array.from({ length: 12 }, (_, index) => ({
          name: `PWR_CHANNEL_${index}`,
          display_order: index,
        })),
      }),
    });
  });

  await page.goto(appUrl("overview"));
  await expect(page.getByRole("heading", { name: "Operator Overview" })).toBeVisible();
  await expect(page.getByText("Loading overview…")).toHaveCount(0);

  await expectScrollable(page.getByTestId("overview-scroll-root"));
});
