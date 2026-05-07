import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { appUrl } from "./support/application-routes";
import {
  PLAYWRIGHT_API_URL,
  fetchSimulatorStatusSnapshot,
  getPreferredTelemetrySource,
  waitForSimulatorReachableViaApi,
} from "./support/telemetry";

test.describe.configure({ mode: "serial" });
/** Simulator managed runtimes + chained navigation + soak can exceed 6 minutes cold. */
test.setTimeout(420_000);

/**
 * Fail the run if any uncaught exception reaches the page (crashy render trees, websocket handlers, etc.).
 * Deliberately not tied to a specific framework error message.
 */
function observeUncaughtPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(err?.message ?? String(err));
  });
  return errors;
}

/**
 * Navigate to the simulator control surface, unblock Play via the same poll/reload circuit as the UI,
 * and require a Running state once playback starts.
 */
async function gotoSimulatorPanelAndStartPlayback(
  page: Page,
  request: APIRequestContext,
  sourceId: string,
): Promise<void> {
  /**
   * Play stays disabled until the status probe reports connected; cold simulator containers
   * can take a long time. Warm the backend first, then require the DOM to mirror the same gate.
   */
  await waitForSimulatorReachableViaApi(request, sourceId);

  await page.goto(`/apps/sources/simulator/${encodeURIComponent(sourceId)}`);
  const simulatorPanel = page.getByTestId("simulator-panel");
  await expect(simulatorPanel).toBeVisible({ timeout: 90_000 });

  /**
   * Play tracks the same simulator status RPC the UI polls; hydration can lag backend readiness.
   * If the gateway already reports `connected`, reload once or twice before giving up — common when
   * the managed simulator container wakes between the warmup GETs and this navigation.
   */
  const playButton = page.getByTestId("simulator-play-button");
  await expect
    .poll(
      async () => {
        if (await playButton.isEnabled()) {
          return true;
        }
        const snap = await fetchSimulatorStatusSnapshot(request, sourceId);
        const apiBody = snap.ok ? snap.payload : null;
        const apiConnected =
          typeof apiBody === "object"
          && apiBody !== null
          && (apiBody as { connected?: boolean }).connected === true;
        if (!apiConnected) {
          await waitForSimulatorReachableViaApi(request, sourceId, {
            timeoutMs: 60_000,
            intervalMs: 2_000,
          });
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(simulatorPanel).toBeVisible({ timeout: 30_000 });
        return await playButton.isEnabled();
      },
      {
        message:
          `Expected simulator Play enabled for ${sourceId} (status via ${PLAYWRIGHT_API_URL}).`,
        timeout: 240_000,
        intervals: [2_500, 4_000, 8_000, 15_000],
      },
    )
    .toEqual(true);

  await playButton.click();

  await expect(
    page.getByTestId("simulator-panel").getByText("Running").first()
  ).toBeVisible({
    timeout: 120_000,
  });
}

/**
 * End-to-end: simulator start → live feed → telemetry detail Analysis shell loads and header values advance.
 *
 * Hardens simulator Play (API warmup + polled reload until the real enable gate matches `/simulator/status`),
 * requires multiple streamed `data-value` updates on the detail header, feed badge connected once stable,
 * and fails on uncaught page errors (render/runtime crashes during the scenario).
 */
test("edge proxy: simulator yields live telemetry on channel detail @edge-proxy", async ({
  page,
  request,
}) => {
  const uncaughtPageErrors = observeUncaughtPageErrors(page);

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

  await gotoSimulatorPanelAndStartPlayback(page, request, sourceId);

  await page.goto(appUrl("telemetry", [sourceId, channelName!]));

  await expect(page.getByRole("tabpanel", { name: "Analysis" })).toBeVisible({
    timeout: 120_000,
  });

  await expect(page.getByTestId("telemetry-detail-live-badge")).toBeVisible({
    timeout: 120_000,
  });

  await expect(page.getByTestId("telemetry-feed-status")).toHaveAttribute(
    "data-feed-state",
    "connected",
    { timeout: 120_000 }
  );

  const valueCell = page.locator("header span[data-value]").first();
  await expect(valueCell).toBeAttached();

  /** Require several distinct streamed values — a single one-off repaint would satisfy an overly weak check. */
  const readDisplayedValue = () => valueCell.getAttribute("data-value");

  let last = await readDisplayedValue();
  expect(last, "header value cell should expose an initial data-value").toBeTruthy();

  for (let step = 0; step < 3; step++) {
    const previous = last;
    await expect
      .poll(readDisplayedValue, { timeout: 120_000 })
      .not.toBe(previous);
    last = await readDisplayedValue();
    expect(last).toBeTruthy();
  }

  /**
   * Inventory polls `/telemetry/inventory` but does not mount RealtimeTelemetryProvider; ContextBanner still
   * must reflect feed health via `/ops/feed-status` so Feed does not fall back to "No data".
   *
   * Kept in this test (versus a separate case) so we reuse one Running simulator session: a second cold
   * Play-enable poll often flakes when playback is already active.
   */
  await page.goto(appUrl("telemetry", [], { source: sourceId }));

  /** Fresh inventory timestamps — proves polling sees live telemetry for this scenario. */
  await expect(page.getByText("just now").first()).toBeVisible({ timeout: 120_000 });

  /** ContextBanner feed badge polls feed-status when realtime context is absent. */
  await expect(page.getByTestId("telemetry-feed-status")).toHaveAttribute(
    "data-feed-state",
    "connected",
    { timeout: 120_000 }
  );

  expect(uncaughtPageErrors, uncaughtPageErrors.join("\n")).toEqual([]);
});
