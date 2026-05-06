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
  const send = page.getByRole("button", { name: "Send" });
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  await expect
    .poll(
      async () => {
        if (await send.isDisabled()) return false;
        const label = await send.textContent();
        return label != null && !label.includes("Sending");
      },
      { timeout: 120_000, intervals: [200, 500, 1000] },
    )
    .toBe(true);
}

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

  await waitForComposerReady(page);
  const composer = page.getByTestId("ai-engineer-chat-input");
  const readMsg = "[scripted:scripted_read_tools] Validate deterministic read tools.";
  await composer.fill(readMsg);
  await expect(composer).toHaveValue(readMsg);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("navigation.requested")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("run.completed")).toBeVisible({ timeout: 30_000 });

  await waitForComposerReady(page);
  const deployMsg = "[scripted:scripted_write_deploy] Deploy the deterministic fixture.";
  await composer.fill(deployMsg);
  await expect(composer).toHaveValue(deployMsg);
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
  await page.getByRole("button", { name: "Send" }).click();

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

  await expect(page.getByText("tool.started").first()).toBeVisible();
  await expect(page.getByText("tool.completed").first()).toBeVisible();
  expect(browserErrors).toEqual([]);
});
