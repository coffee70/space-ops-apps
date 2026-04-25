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
    description: "Live battery efficiency runtime application.",
    iconKey: "battery-charging",
    iconColor: "#38bdf8",
    iconBackground: "rgba(56, 189, 248, 0.16)",
    applicationType: "embedded",
    routePath: "/apps/battery-efficiency",
    embeddedUrl: "/runtime-applications/battery-efficiency",
    proxyBasePath: "/runtime-applications/battery-efficiency",
    version: "0.1.0",
    enabled: true,
    iframeSandbox: "allow-scripts allow-same-origin allow-forms",
    iframeAllow: "",
    sortOrder: 60,
    owner: "space-ops-kernel",
    capabilities: ["battery-analysis"],
    healthStatus: "healthy",
    deploymentStatus: "deployed",
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

test("launcher opens the deployed battery efficiency application route in the platform runtime", async ({
  page,
}) => {
  await page.goto(appUrl("overview"));
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Overview");

  await page.getByTestId("applications-nav-item").click();
  await expect(page.getByRole("dialog", { name: "Applications" })).toBeVisible();

  await page.getByTestId("applications-launcher-search").fill("battery");
  await expect(page.getByTestId("application-option-battery-efficiency")).toBeVisible();
  await page.getByTestId("application-option-battery-efficiency").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Battery Efficiency");

  await page.getByTestId("applications-launcher-open").click();
  await expect(page).toHaveURL(/\/apps\/battery-efficiency$/);
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Battery Efficiency");
  await expect(page.getByRole("heading", { name: "Application unavailable" })).toBeVisible();
  await expect(page.getByText("The embedded application is missing its iframe target.")).toBeVisible();
});
