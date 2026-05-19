import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

import { appUrl } from "./support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";
const fixtureDocumentPath = resolve(
  process.cwd(),
  "..",
  "..",
  "..",
  "space-ops-platform",
  "backend",
  "tests",
  "fixtures",
  "phase3_documents",
  "battery_efficiency_notes.md",
);

test.setTimeout(180_000);

async function waitForComposerReady(page: Page) {
  const input = page.getByTestId("ai-engineer-chat-input");
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled({ timeout: 120_000 });
}

async function uploadKnowledgeDocument(page: Page) {
  const documentTitle = `battery efficiency notes ${Date.now()}`;
  await page.goto(appUrl("knowledge"));

  await expect(page.getByTestId("knowledge-app")).toBeVisible();
  await page.getByTestId("knowledge-upload-button").click();

  const uploadDialog = page.getByTestId("knowledge-upload-dialog");
  await expect(uploadDialog).toBeVisible();
  await uploadDialog.locator('input[type="file"]').setInputFiles(fixtureDocumentPath);
  await expect(uploadDialog.getByText("battery_efficiency_notes.md").first()).toBeVisible();
  await uploadDialog.locator("#knowledge-title").fill(documentTitle);

  await uploadDialog.getByRole("button", { name: "Upload" }).click();
  await expect(uploadDialog).toBeHidden({ timeout: 30_000 });

  const documentCard = page
    .getByTestId("knowledge-document-card")
    .filter({ hasText: documentTitle })
    .first();
  await expect(documentCard).toContainText("Ready", { timeout: 120_000 });
}

test("AI Engineer deterministic Phase 3 no-LLM flow covers Knowledge upload, read tools, deploy, and cleanup", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror:${error.message}`);
  });

  await uploadKnowledgeDocument(page);
  await page.goto(appUrl("ai-engineer"));

  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await expect(page.getByTestId("ai-engineer-shell").getByText("AI Engineer", { exact: true })).toBeVisible();
  await page.getByTestId("ai-engineer-new-chat-button").click();
  await waitForComposerReady(page);
  await page.getByTestId("ai-engineer-composer").getByRole("button", { name: "Execute" }).click();

  await waitForComposerReady(page);
  const composer = page.getByTestId("ai-engineer-chat-input");
  const readMsg = "[scripted:scripted_read_tools] Validate deterministic read tools.";
  await composer.fill(readMsg);
  await expect(composer).toHaveValue(readMsg);
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page
      .getByTestId("ai-engineer-chat-transcript")
      .getByTestId("ai-engineer-assistant-message")
      .filter({ hasText: "Deterministic scripted read workflow completed through Tool Execution." }),
  ).toBeVisible({ timeout: 30_000 });
  const activityPanel = page.getByTestId("ai-engineer-activity-panel");
  await expect(activityPanel.getByText("Navigation requested").first()).toBeVisible({ timeout: 30_000 });
  await expect(activityPanel.getByText("Run completed").first()).toBeVisible({ timeout: 30_000 });

  await waitForComposerReady(page);
  const deployMsg = "[scripted:scripted_write_deploy] Deploy the deterministic fixture.";
  await composer.fill(deployMsg);
  await expect(composer).toHaveValue(deployMsg);
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Send message" }).click();

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/registry/services/phase3-test-fixture-service`);
      if (!response.ok()) return { ok: false };
      const payload = await response.json();
      return {
        ok: true,
        serviceSlug: payload.serviceSlug,
        deploymentStatus: payload.deploymentStatus,
        healthStatus: payload.healthStatus,
      };
    }, { timeout: 120_000 })
    .toMatchObject({
      ok: true,
      serviceSlug: "phase3-test-fixture-service",
      deploymentStatus: "healthy",
      healthStatus: "passing",
    });

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/internal/runtime-services/phase3-test-fixture-service/health`);
      return response.status();
    }, { timeout: 120_000 })
    .toBe(200);

  await waitForComposerReady(page);
  const cleanupMsg = "[scripted:scripted_delete_cleanup] Delete the deterministic fixture.";
  await composer.fill(cleanupMsg);
  await expect(composer).toHaveValue(cleanupMsg);
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page
      .getByTestId("ai-engineer-chat-transcript")
      .getByTestId("ai-engineer-assistant-message")
      .filter({
        hasText: /Deterministic scripted cleanup completed[\s\S]*delete_managed_resources/,
      }),
  ).toBeVisible({ timeout: 150_000 });

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/registry/services/phase3-test-fixture-service`);
      return response.status();
    }, { timeout: 120_000 })
    .toBe(404);

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/internal/runtime-services/phase3-test-fixture-service/health`);
      return response.status();
    }, { timeout: 120_000 })
    .toBe(404);

  await expect(activityPanel.getByText("Tool started").first()).toBeVisible();
  await expect(activityPanel.getByText("Tool completed").first()).toBeVisible();
  expect(browserErrors).toEqual([]);
});
