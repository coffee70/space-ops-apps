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
    applicationId: "sources",
    title: "Control Panel",
    description: "Source registry, vehicle configuration, and AI Engineer control settings.",
    iconKey: "settings",
    iconColor: "#fb7185",
    iconBackground: "rgba(251, 113, 133, 0.16)",
    applicationType: "native",
    routePath: "/apps/sources",
    loaderKey: "sources",
    version: "0.1.0",
    enabled: true,
    sortOrder: 40,
    owner: "space-ops-apps",
    capabilities: ["source-management", "ai-engineer-configuration"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
  },
];

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
  await expect(page.getByTestId("application-option-sources")).toBeVisible();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Control Panel");
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

  await page.goto(appUrl("sources"));
  await expect(page).toHaveURL(/\/apps\/sources(?:\?.*)?$/);
  await expect(page.getByTestId("control-panel-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
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

  await page.goto(appUrl("sources", ["ai-engineer"]));
  await expect(page.getByTestId("ai-engineer-model-config-editor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Validate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
});
