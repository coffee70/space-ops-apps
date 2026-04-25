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
    applicationId: "workspace",
    title: "Workspace",
    description: "Open VS Code Server workspace.",
    iconKey: "folder-code",
    iconColor: "#38bdf8",
    iconBackground: "rgba(56, 189, 248, 0.16)",
    applicationType: "embedded",
    routePath: "/apps/workspace",
    embeddedUrl: "/workspace",
    proxyBasePath: "/workspace",
    version: "0.1.0",
    enabled: true,
    iframeSandbox: "allow-scripts allow-same-origin allow-forms",
    iframeAllow: "",
    sortOrder: 50,
    owner: "space-ops-apps",
    capabilities: ["development-workspace"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
  },
  {
    applicationId: "battery-efficiency",
    title: "Battery Efficiency",
    description: "Example native analysis app built inside the platform shell over Layer 2 telemetry.",
    iconKey: "battery",
    iconColor: "#f59e0b",
    iconBackground: "rgba(245, 158, 11, 0.16)",
    applicationType: "native",
    routePath: "/apps/battery-efficiency",
    loaderKey: "battery-efficiency",
    version: "0.1.0",
    enabled: true,
    sortOrder: 60,
    owner: "space-ops-apps",
    capabilities: ["telemetry-analysis", "battery-analysis"],
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

  await page.getByTestId("applications-launcher-search").fill("work");
  await expect(page.getByTestId("application-option-workspace")).toBeVisible();
  await page.getByTestId("application-option-workspace").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Workspace");

  await page.getByTestId("applications-launcher-open").click();
  await expect(page).toHaveURL(/\/apps\/workspace$/);
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Workspace");
  await expect(page.getByTestId("embedded-application-frame")).toHaveAttribute("src", "/workspace");
});

test("launcher opens the native battery efficiency application route", async ({ page }) => {
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

  await page.getByTestId("applications-launcher-search").fill("battery");
  await expect(page.getByTestId("application-option-battery-efficiency")).toBeVisible();
  await page.getByTestId("application-option-battery-efficiency").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Battery Efficiency");

  await page.getByTestId("applications-launcher-open").click();
  await expect(page).toHaveURL(/\/apps\/battery-efficiency(?:\?.*)?$/);
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Battery Efficiency");
  await expect(page.getByTestId("battery-efficiency-native-app")).toBeVisible();
  await expect(page.getByTestId("battery-efficiency-card-soc")).toBeVisible();
  await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
});

test("launcher details show Battery Efficiency as a native application", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });

  await page.goto(appUrl("overview"));
  await page.getByTestId("applications-nav-item").click();
  await page.getByTestId("application-option-battery-efficiency").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Native application");
});
