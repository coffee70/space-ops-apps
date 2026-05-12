import { expect, test } from "@playwright/test";
import { appUrl } from "./support/application-routes";

const MIN_MODEL_YAML = `version: 1
defaults:
  chatModel: m1
  codingModel: m1
  fastModel: m1
  restrictedModel: m1
providers:
  p1:
    type: openai
    displayName: OpenAI
    apiKeyEnv: OPENAI_API_KEY
models:
  - id: m1
    providerRef: p1
    providerModelId: gpt-4o-mini
    enabled: true
    defaultFor: [chat, coding, fast]
`;

const registryPayload = [
  {
    applicationId: "overview",
    title: "Overview",
    description: "Mission overview dashboard.",
    iconKey: "layout-dashboard",
    iconColor: "#38bdf8",
    iconBackground: "rgba(56, 189, 248, 0.16)",
    applicationType: "native",
    routePath: "/apps/overview",
    loaderKey: "overview",
    version: "0.1.0",
    enabled: true,
    sortOrder: 10,
    owner: "space-ops-apps",
    capabilities: ["telemetry-overview"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
  },
  {
    applicationId: "control-panel",
    title: "Control Panel",
    description: "Source registry, vehicle configuration, and AI Engineer control settings.",
    iconKey: "settings",
    iconColor: "#fb7185",
    iconBackground: "rgba(251, 113, 133, 0.16)",
    applicationType: "native",
    routePath: "/apps/control-panel",
    loaderKey: "control-panel",
    version: "0.1.0",
    enabled: true,
    sortOrder: 40,
    owner: "space-ops-apps",
    capabilities: ["source-management", "vehicle-configuration", "ai-engineer-configuration"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
  },
];

const deploymentOverviewPayload = {
  generated_at: "2026-05-12T12:00:00Z",
  overall_state: "degraded",
  core: {
    expected_count: 1,
    existing_count: 1,
    healthy_count: 1,
    warning_count: 0,
    broken_count: 0,
    missing_count: 0,
    services: [
      {
        id: "control-plane",
        display_name: "Control Plane",
        group: "core",
        expected: true,
        exists: true,
        ui_state: "healthy",
        health_status: "healthy",
        deployment_status: null,
        bootstrap_status: null,
        container_state: "running",
        container_status: "Up 2 minutes (healthy)",
        updated_at: "2026-05-12T12:00:00Z",
        last_checked_at: "2026-05-12T12:00:00Z",
        details: {},
      },
    ],
  },
  runtime: {
    expected_count: 1,
    existing_count: 1,
    healthy_count: 0,
    warning_count: 1,
    broken_count: 0,
    missing_count: 0,
    services: [
      {
        id: "vehicle-config-service",
        display_name: "Vehicle Config Service",
        group: "runtime",
        expected: true,
        exists: true,
        ui_state: "deploying",
        health_status: "starting",
        deployment_status: "building",
        bootstrap_status: "completed_with_failures",
        container_state: "running",
        container_status: "Up 1 minute",
        latest_deployment_id: "dep_vehicle_config",
        updated_at: "2026-05-12T12:00:00Z",
        last_checked_at: "2026-05-12T12:00:00Z",
        details: {},
      },
    ],
  },
  bootstrap: {
    run_id: 7,
    status: "completed_with_failures",
    started_at: "2026-05-12T11:58:00Z",
    completed_at: "2026-05-12T12:00:00Z",
    failure_reason: null,
    summary: { failed: 2 },
  },
};

test("launcher lists Control Panel instead of Sources @control-panel", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });

  await page.goto(appUrl("overview"));
  await page.getByTestId("applications-nav-item").click();
  await page.getByTestId("applications-launcher-search").fill("Control Panel");
  await expect(page.getByTestId("application-option-control-panel")).toBeVisible();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Control Panel");
  await page.getByTestId("applications-launcher-search").fill("sources");
  await expect(page.getByTestId("application-option-sources")).toHaveCount(0);
});

test("Control Panel sources tab shows telemetry chrome @control-panel", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });
  await page.route("**/telemetry/sources", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/telemetry/sources/*/simulator/status*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: false }) });
  });

  await page.goto(appUrl("control-panel"));
  await expect(page).toHaveURL(/\/apps\/control-panel(?:\?.*)?$/);
  await expect(page.getByTestId("control-panel-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.getByText("Telemetry sources, deployments, vehicle configs, and AI Engineer settings.")).toBeHidden();
});

test("Deployments tab uses compact summary and purpose-fit service tables @control-panel", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });
  await page.route("**/system/deployments/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(deploymentOverviewPayload),
    });
  });

  await page.goto(appUrl("control-panel", ["deployments"]));
  await expect(page.getByTestId("deployment-summary-strip")).toContainText("Bootstrap");
  await expect(page.getByTestId("deployment-summary-strip")).toContainText("Completed with failures · 2 failed");

  const corePanel = page.getByTestId("core-services-panel");
  await expect(corePanel.getByRole("columnheader", { name: "Deployment" })).toHaveCount(0);
  await expect(corePanel.getByRole("columnheader", { name: "Bootstrap" })).toHaveCount(0);
  await expect(corePanel.getByRole("columnheader", { name: "Health" })).toBeVisible();
  await expect(corePanel.getByText("running")).toBeVisible();

  const runtimePanel = page.getByTestId("runtime-services-panel");
  await expect(runtimePanel.getByRole("columnheader", { name: "Deployment" })).toBeVisible();
  await expect(runtimePanel.getByRole("columnheader", { name: "Bootstrap" })).toBeVisible();
  await expect(page.getByTestId("deployment-service-vehicle-config-service").getByText("Vehicle Config Service")).toBeVisible();
  await expect(page.getByTestId("deployment-service-vehicle-config-service").getByText("vehicle-config-service")).toHaveCount(0);
});

test("AI Engineer tab shows model config editor shell @control-panel", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });
  await page.route("**/intelligence/agent/model-config", async (route) => {
    if (route.request().method() !== "GET") {
      return route.continue();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        path: "/tmp/models.local.yaml",
        content: MIN_MODEL_YAML,
        format: "yaml",
        parsed: {
          provider_count: 1,
          model_count: 1,
          enabled_model_count: 1,
          default_model_id: "m1",
          provider_types: ["openai"],
          missing_api_key_envs: [],
          warnings: [],
        },
        validation_errors: [],
      }),
    });
  });
  await page.route("**/intelligence/agent/model-config/validate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        valid: false,
        parsed: null,
        errors: [{ loc: ["models"], message: "invalid", type: "test" }],
      }),
    });
  });

  await page.goto(appUrl("control-panel", ["ai-engineer"]));
  await expect(page).toHaveURL(/\/apps\/control-panel\/ai-engineer/);
  await expect(page.getByTestId("ai-engineer-model-config-editor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Validate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible();

  const editorBox = await page.locator(".monaco-editor").boundingBox();
  expect(editorBox?.height ?? 0).toBeGreaterThan(300);
});
