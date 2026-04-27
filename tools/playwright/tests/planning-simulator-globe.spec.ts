import { expect, test, type APIRequestContext } from "@playwright/test";
import { appUrl } from "./support/application-routes";

const API_URL = process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:8000";

test.describe.configure({ mode: "serial" });
test.setTimeout(150_000);

interface TelemetrySource {
  id: string;
  name: string;
  source_type?: string;
}

interface PositionMapping {
  id: string;
  vehicle_id: string;
}

interface PositionMappingPayload {
  frame_type: "gps_lla" | "ecef" | "eci";
  lat_channel_name?: string;
  lon_channel_name?: string;
  alt_channel_name?: string;
  x_channel_name?: string;
  y_channel_name?: string;
  z_channel_name?: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getPlanningSimulator(request: APIRequestContext): Promise<TelemetrySource> {
  const response = await request.get(`${API_URL}/telemetry/sources`);
  expect(response.ok()).toBeTruthy();
  const sources = (await response.json()) as TelemetrySource[];
  const simulator = sources.find((source) => source.source_type === "simulator");
  expect(simulator).toBeTruthy();
  return simulator!;
}

async function ensureSimulatorPositionMapping(
  request: APIRequestContext,
  simulatorId: string,
  payload: PositionMappingPayload
) {
  const response = await request.post(`${API_URL}/telemetry/position/config`, {
    data: {
      vehicle_id: simulatorId,
      active: true,
      ...payload,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function getSimulatorPositionMappingPayload(
  request: APIRequestContext,
  simulatorId: string
): Promise<{ payload: PositionMappingPayload; summaryPrefix: string }> {
  const response = await request.get(
    `${API_URL}/telemetry/list?source_id=${encodeURIComponent(simulatorId)}`
  );
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    channels?: Array<{ name?: string }>;
  };
  const channelNames = new Set(
    (body.channels ?? [])
      .map((channel) => channel.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0)
  );

  if (channelNames.has("GPS_LAT") && channelNames.has("GPS_LON")) {
    return {
      payload: {
        frame_type: "gps_lla",
        lat_channel_name: "GPS_LAT",
        lon_channel_name: "GPS_LON",
        alt_channel_name: channelNames.has("GPS_ALT") ? "GPS_ALT" : undefined,
      },
      summaryPrefix: "GPS:",
    };
  }

  if (channelNames.has("POS_ECEF_X") && channelNames.has("POS_ECEF_Y") && channelNames.has("POS_ECEF_Z")) {
    return {
      payload: {
        frame_type: "ecef",
        x_channel_name: "POS_ECEF_X",
        y_channel_name: "POS_ECEF_Y",
        z_channel_name: "POS_ECEF_Z",
      },
      summaryPrefix: "ECEF:",
    };
  }

  if (channelNames.has("POS_ECI_X") && channelNames.has("POS_ECI_Y") && channelNames.has("POS_ECI_Z")) {
    return {
      payload: {
        frame_type: "eci",
        x_channel_name: "POS_ECI_X",
        y_channel_name: "POS_ECI_Y",
        z_channel_name: "POS_ECI_Z",
      },
      summaryPrefix: "ECI:",
    };
  }

  throw new Error(`No supported position mapping channels found for simulator ${simulatorId}`);
}

async function getPositionMapping(
  request: APIRequestContext,
  simulatorId: string
): Promise<PositionMapping | null> {
  const response = await request.get(
    `${API_URL}/telemetry/position/config?vehicle_id=${encodeURIComponent(simulatorId)}`
  );
  expect(response.ok()).toBeTruthy();
  const mappings = (await response.json()) as PositionMapping[];
  return mappings[0] ?? null;
}

async function ensureSimulatorRunning(
  request: APIRequestContext,
  simulatorId: string
) {
  const statusResponse = await request.get(
    `${API_URL}/simulator/status?vehicle_id=${encodeURIComponent(simulatorId)}`
  );
  expect(statusResponse.ok()).toBeTruthy();

  const status = (await statusResponse.json()) as {
    connected?: boolean;
    state?: string | null;
  };

  if (status.connected === true && status.state === "running") {
    return;
  }

  const response = await request.post(`${API_URL}/simulator/start`, {
    data: {
      scenario: "orbit_nominal",
      duration: 0,
      speed: 1,
      drop_prob: 0,
      jitter: 0.1,
      vehicle_id: simulatorId,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function stopSimulator(request: APIRequestContext, simulatorId: string) {
  const response = await request.post(
    `${API_URL}/simulator/stop?vehicle_id=${encodeURIComponent(simulatorId)}`
  );
  expect(response.ok()).toBeTruthy();
}

test("planning renders the live simulator marker on the globe", async ({
  page,
  request,
}) => {
  const simulator = await getPlanningSimulator(request);
  const mapping = await getSimulatorPositionMappingPayload(request, simulator.id);
  await ensureSimulatorPositionMapping(request, simulator.id, mapping.payload);
  await ensureSimulatorRunning(request, simulator.id);

  await page.addInitScript((simulatorId: string) => {
    window.sessionStorage.setItem(
      "planningShowOnGlobeIds",
      JSON.stringify([simulatorId])
    );
  }, simulator.id);

  await page.goto(appUrl("planning"));
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Planning");

  let simulatorRow = page.getByTestId(`planning-source-row-${simulator.id}`);
  await expect(page.getByText("Loading mappings...")).toHaveCount(0, { timeout: 30_000 });
  await expect(simulatorRow).toBeVisible({ timeout: 30_000 });
  await expect(simulatorRow).toHaveAttribute("aria-pressed", "true");
  await simulatorRow.click();
  await expect(simulatorRow).toHaveAttribute("aria-pressed", "false");
  await simulatorRow.click();
  await expect(simulatorRow).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("planning-position-mapping-configure").click();
  const mappingDialog = page.getByRole("dialog", {
    name: "Configure position mapping",
  });
  await expect(mappingDialog).toBeVisible();
  await expect(
    mappingDialog.getByRole("button", { name: new RegExp(escapeRegExp(simulator.name)) })
  ).toBeVisible();
  await expect(await getPositionMapping(request, simulator.id)).toBeTruthy();

  await mappingDialog.getByTestId("position-mapping-remove").click();
  const deleteConfirm = page.getByRole("alertdialog", {
    name: new RegExp(
      `Delete position mapping for ${escapeRegExp(simulator.name)}`
    ),
  });
  await expect(deleteConfirm).toBeVisible();
  await expect(await getPositionMapping(request, simulator.id)).toBeTruthy();

  await deleteConfirm.getByTestId("position-mapping-delete-confirm").click();
  await expect(deleteConfirm).toBeHidden();
  await expect(await getPositionMapping(request, simulator.id)).toBeNull();
  await expect(
    mappingDialog.getByTestId("position-mapping-remove")
  ).toHaveCount(0);
  await mappingDialog.getByRole("button", { name: "Close" }).first().click();
  await expect(mappingDialog).toBeHidden();
  await expect(simulatorRow).toContainText("Not configured");

  await ensureSimulatorPositionMapping(request, simulator.id, mapping.payload);
  await page.reload();
  simulatorRow = page.getByTestId(`planning-source-row-${simulator.id}`);
  await expect(simulatorRow).toContainText(mapping.summaryPrefix);

  await page.getByRole("tab", { name: "Observations" }).click();
  const observationsRow = page.getByTestId(
    `planning-observations-row-${simulator.id}`
  );
  await expect(observationsRow).toHaveAttribute("aria-expanded", "false");
  await observationsRow.click();
  await expect(observationsRow).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(`${simulator.name} observations`)).toBeVisible();

  await page.getByRole("tab", { name: "View" }).click({ force: true });
  await expect(
    page.getByText("An error occurred while rendering. Rendering has stopped.")
  ).toHaveCount(0);
  await expect(page.locator("main")).toContainText("Live", { timeout: 30_000 });
});

test("planning shows no data for a selected simulator after it stops", async ({
  page,
  request,
}) => {
  const simulator = await getPlanningSimulator(request);
  const mapping = await getSimulatorPositionMappingPayload(request, simulator.id);
  await ensureSimulatorPositionMapping(request, simulator.id, mapping.payload);
  await ensureSimulatorRunning(request, simulator.id);

  await page.addInitScript((simulatorId: string) => {
    window.sessionStorage.setItem(
      "planningShowOnGlobeIds",
      JSON.stringify([simulatorId])
    );
  }, simulator.id);

  await page.goto(appUrl("planning"));
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Planning");
  await expect(page.getByText("Loading mappings...")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("main")).toContainText("Live", { timeout: 30_000 });

  await stopSimulator(request, simulator.id);

  await expect(page.locator("main")).toContainText("No data", { timeout: 30_000 });
});
