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
    applicationId: "knowledge",
    title: "Knowledge",
    description: "Durable mission and vehicle document knowledge for AI retrieval.",
    iconKey: "brain",
    iconColor: "#a78bfa",
    iconBackground: "rgba(167, 139, 250, 0.16)",
    applicationType: "native",
    routePath: "/apps/knowledge",
    loaderKey: "knowledge",
    version: "0.1.0",
    enabled: true,
    sortOrder: 24,
    owner: "space-ops-apps",
    capabilities: ["knowledge-management", "document-ingestion", "ai-retrieval"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
  },
];

test("Knowledge opens from launcher and shows document library controls @smoke", async ({ page }) => {
  await page.route("**/registry/applications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(registryPayload),
    });
  });
  await page.route("**/intelligence/documents", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "doc-1",
          title: "Telemetry Dictionary",
          document_type: "csv",
          mission_id: "demo",
          vehicle_id: "vehicle-a",
          subsystem_id: "eps",
          tags: ["telemetry", "dictionary"],
          description: "Channel definitions and operational limits.",
          ingestion_status: "ready",
          created_at: "2026-05-13T12:00:00Z",
          updated_at: "2026-05-13T12:00:00Z",
        },
      ]),
    });
  });

  await page.goto(appUrl("overview"));
  await page.getByTestId("applications-nav-item").click();
  await page.getByTestId("applications-launcher-search").fill("Knowledge");
  await page.getByTestId("application-option-knowledge").click();
  await expect(page.getByTestId("applications-launcher-details")).toContainText("Knowledge");

  await page.getByTestId("applications-launcher-open").click();
  await expect(page).toHaveURL(/\/apps\/knowledge(?:\?.*)?$/);
  await expect(page.getByTestId("knowledge-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Knowledge" })).toBeVisible();
  await expect(page.getByTestId("knowledge-upload-button")).toBeVisible();
  await expect(page.getByTestId("knowledge-document-card")).toContainText("Telemetry Dictionary");
  await expect(page.getByTestId("knowledge-document-card")).toContainText("ready");
});
