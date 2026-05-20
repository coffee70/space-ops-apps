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
    summary: { failed: 2, blocked: 0 },
    dependency_issues: { cycles: [], blocked_units: [], invalid_dependencies: [] },
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

test("Deployments tab shows blocked diagnostics and dependency cycle banner @control-panel", async ({ page }) => {
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
      body: JSON.stringify({
        ...deploymentOverviewPayload,
        overall_state: "broken",
        runtime: {
          ...deploymentOverviewPayload.runtime,
          warning_count: 0,
          broken_count: 1,
          services: [
            {
              ...deploymentOverviewPayload.runtime.services[0],
              id: "agent-runtime-service",
              display_name: "Agent Runtime Service",
              ui_state: "blocked",
              bootstrap_status: "blocked",
              failure_reason:
                "Blocked by dependency cycle: agent-runtime-service -> context-retrieval-service -> code-intelligence-service -> agent-runtime-service.",
            },
          ],
        },
        bootstrap: {
          ...deploymentOverviewPayload.bootstrap,
          summary: { failed: 0, blocked: 1 },
          dependency_issues: {
            cycles: [
              {
                units: ["agent-runtime-service", "context-retrieval-service", "code-intelligence-service"],
                path: [
                  "agent-runtime-service",
                  "context-retrieval-service",
                  "code-intelligence-service",
                  "agent-runtime-service",
                ],
              },
            ],
            blocked_units: [
              {
                unit_id: "agent-runtime-service",
                reason: "dependency_cycle",
                blocking_units: ["agent-runtime-service", "context-retrieval-service", "code-intelligence-service"],
              },
            ],
            invalid_dependencies: [],
          },
        },
      }),
    });
  });

  await page.goto(appUrl("control-panel", ["deployments"]));

  await expect(page.getByText("Runtime dependency cycle detected")).toBeVisible();
  await expect(page.getByText("Independent services continue bootstrapping normally.")).toBeVisible();
  await expect(page.locator("code")).toHaveText(
    "agent-runtime-service -> context-retrieval-service -> code-intelligence-service -> agent-runtime-service"
  );
  await expect(page.getByTestId("deployment-summary-strip")).toContainText("1 blocked");
  await expect(page.getByTestId("deployment-service-agent-runtime-service")).toContainText("Blocked");
  await page.getByText("Details and latest error context").click();
  await expect(page.getByText("Blocked by dependency cycle")).toBeVisible();
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

test("Simulator manage route scrolls inside the native application host @control-panel", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 420 });
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });
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
  await page.route("**/simulator/status?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connected: true,
        state: "idle",
        supported_scenarios: [
          {
            name: "nominal",
            description: "Nominal telemetry playback.",
          },
        ],
      }),
    });
  });

  await page.goto(appUrl("control-panel", ["simulator", "sim-source"]));
  const scrollRoot = page.getByTestId("simulator-manage-scroll-root");
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
  await expect(page.getByTestId("simulator-play-button")).toBeVisible();
});
