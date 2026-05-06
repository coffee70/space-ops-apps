import { expect, test } from "@playwright/test";
import { appUrl } from "./support/application-routes";

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
    applicationId: "ai-engineer",
    title: "AI Engineer",
    description: "AI-native engineering interface for platform capabilities.",
    iconKey: "sparkles",
    iconColor: "#34d399",
    iconBackground: "rgba(52, 211, 153, 0.16)",
    applicationType: "native",
    routePath: "/apps/ai-engineer",
    loaderKey: "ai-engineer",
    version: "0.1.0",
    enabled: true,
    sortOrder: 25,
    owner: "space-ops-apps",
    capabilities: ["ai-engineering", "platform-intelligence"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
  },
];

test("launcher supports search, selection, and open behavior", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });

  await page.goto(appUrl("overview"));
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Overview");

  await page.getByTestId("applications-nav-item").click();
  await expect(page.getByRole("dialog", { name: "Applications" })).toBeVisible();
  await expect(page.getByTestId("applications-launcher-search")).toBeFocused();

  await page.getByTestId("applications-launcher-search").fill("AI Engineer");
  await expect(page.getByTestId("application-option-ai-engineer")).toBeVisible();
  await page.getByTestId("application-option-ai-engineer").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("AI Engineer");

  await page.getByTestId("applications-launcher-open").click();
  await expect(page).toHaveURL(/\/apps\/ai-engineer(?:\?.*)?$/);
  await expect(page.getByTestId("current-application-nav-item")).toContainText("AI Engineer");
  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await expect(page.getByTestId("ai-engineer-shell").getByText("AI Engineer", { exact: true })).toBeVisible();
  await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
});

test("launcher opens a native application route through the shell", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });

  await page.goto(appUrl("overview"));
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Overview");

  await page.getByTestId("applications-nav-item").click();
  await expect(page.getByRole("dialog", { name: "Applications" })).toBeVisible();

  await page.getByTestId("applications-launcher-search").fill("AI Engineer");
  await expect(page.getByTestId("application-option-ai-engineer")).toBeVisible();
  await page.getByTestId("application-option-ai-engineer").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("AI Engineer");

  await page.getByTestId("applications-launcher-open").click();
  await expect(page).toHaveURL(/\/apps\/ai-engineer(?:\?.*)?$/);
  await expect(page.getByTestId("current-application-nav-item")).toContainText("AI Engineer");
  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await expect(page.getByTestId("ai-engineer-shell").getByText("AI Engineer", { exact: true })).toBeVisible();
  await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
});

test("launcher details show AI Engineer as a native application", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });

  await page.goto(appUrl("overview"));
  await page.getByTestId("applications-nav-item").click();
  await page.getByTestId("application-option-ai-engineer").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Native application");
});
