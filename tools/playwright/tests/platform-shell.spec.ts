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
];

test("platform shell keeps the side nav visible around a native application", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });

  await page.goto(appUrl("overview"));

  await expect(page.getByTestId("applications-nav-item")).toBeVisible();
  await expect(page.getByTestId("current-application-nav-item")).toContainText("Overview");
  await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
});

for (const applicationId of ["workspace", "embedded-demo", "battery-efficiency"]) {
  test(`deleted application route ${applicationId} renders unavailable state without app metadata`, async ({ page }) => {
    await page.route("**/registry/applications", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(registryPayload),
      });
    });

    await page.goto(appUrl(applicationId));

    await expect(page.getByText("Application unavailable")).toBeVisible();
    await expect(page.getByText("The requested application is not registered in this platform runtime.")).toBeVisible();
    await expect(page.getByTestId("embedded-application-frame")).toHaveCount(0);
    await expect(page.getByTestId("current-application-nav-item")).toHaveCount(0);
  });
}
