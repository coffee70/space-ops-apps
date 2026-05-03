import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

import { appUrl } from "./support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://mission-control-ui:3000";
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

test("AI Engineer deterministic Phase 3 no-LLM flow covers upload, read tools, deploy, and cleanup", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror:${error.message}`);
  });

  const createResponse = await page.request.post(`${baseUrl}/intelligence/agent/conversations`, {
    data: {
      title: `AI Engineer Phase 3 No-LLM ${Date.now()}`,
      execution_mode: "execute",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdConversation = await createResponse.json();
  const conversationId = String(createdConversation.id);

  await page.goto(appUrl("ai-engineer", [], { conversation_id: conversationId }));

  await expect(page.getByRole("heading", { name: "AI Engineer" })).toBeVisible();
  await page.locator("#execution-mode").selectOption("execute");

  await page.locator('input[type="file"]').setInputFiles(fixtureDocumentPath);
  await expect(page.getByText("battery_efficiency_notes.md").first()).toBeVisible();
  await expect(page.getByText("ready").first()).toBeVisible({ timeout: 30_000 });

  await page.locator("textarea").fill("[scripted:scripted_read_tools] Validate deterministic read tools.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("navigation.requested")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("run.completed")).toBeVisible({ timeout: 30_000 });

  await page.locator("textarea").fill("[scripted:scripted_write_deploy] Deploy the deterministic fixture.");
  await page.getByRole("button", { name: "Send" }).click();

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
    }, { timeout: 30_000 })
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
    }, { timeout: 30_000 })
    .toBe(200);

  await page.locator("textarea").fill("[scripted:scripted_delete_cleanup] Delete the deterministic fixture.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/registry/services/phase3-test-fixture-service`);
      return response.status();
    }, { timeout: 30_000 })
    .toBe(404);

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/internal/runtime-services/phase3-test-fixture-service/health`);
      return response.status();
    }, { timeout: 30_000 })
    .toBe(404);

  await expect(page.getByText("tool.started").first()).toBeVisible();
  await expect(page.getByText("tool.completed").first()).toBeVisible();
  expect(browserErrors).toEqual([]);
});
