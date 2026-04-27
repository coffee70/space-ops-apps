import { expect, test } from "@playwright/test";
import { appUrl } from "./support/application-routes";

const registryPayload = [
  {
    applicationId: "workspace",
    title: "Workspace",
    description: "Open VS Code Server workspace.",
    iconKey: "folder-code",
    iconColor: "#38bdf8",
    iconBackground: "rgba(56, 189, 248, 0.16)",
    applicationType: "embedded",
    routePath: "/apps/workspace",
    embeddedUrl: "/_embedded/workspace",
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
];

test.beforeEach(async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });
});

test("workspace opens through the shell with the internal iframe transport path", async ({ page }) => {
  await page.goto(appUrl("workspace"));

  await expect(page).toHaveURL(/\/apps\/workspace$/);
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Workspace");
  await expect(page.getByTestId("embedded-application-frame")).toHaveAttribute("src", "/_embedded/workspace");
});

test("/workspace no longer resolves to workspace application content", async ({ page }) => {
  const legacyWorkspacePath = `/${"workspace"}`;
  const response = await page.goto(legacyWorkspacePath);

  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
});

test("top-level navigation to the workspace transport path redirects back into the shell", async ({ page }) => {
  await page.goto("/_embedded/workspace");

  await expect(page).toHaveURL(/\/apps\/workspace$/);
  await expect(page.getByTestId("embedded-application-frame")).toHaveAttribute("src", "/_embedded/workspace");
});
