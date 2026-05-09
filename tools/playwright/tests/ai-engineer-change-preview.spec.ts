import { expect, test, type Page } from "@playwright/test";

import { appUrl } from "./support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";

test.setTimeout(180_000);

async function fillAndSend(page: Page, message: string) {
  const input = page.getByTestId("ai-engineer-chat-input");
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  await input.fill(message);
  await expect(input).toHaveValue(message);
  const send = page.getByRole("button", { name: "Send message" });
  await expect(send).toBeEnabled({ timeout: 30_000 });
  await send.click();
}

test("AI Engineer chat-native deploy and revert flow @smoke", async ({ page }) => {
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
      title: `AI Engineer Change Preview ${Date.now()}`,
      execution_mode: "execute",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdConversation = await createResponse.json();
  const conversationId = String(createdConversation.id);

  await page.goto(appUrl("ai-engineer", [], { conversation_id: conversationId }));

  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await page.getByTestId("ai-engineer-composer").getByRole("button", { name: "Execute" }).click();

  await fillAndSend(page, "[scripted:scripted_change_preview] Prepare a scoped change preview.");

  const summaryCard = page.getByTestId("change-summary-card");
  await expect(summaryCard).toBeVisible({ timeout: 60_000 });
  await expect(summaryCard).toContainText("Ready to preview changes");
  await expect(summaryCard).toContainText("preview/derived-telemetry-preview");

  const deployButton = page.getByTestId("change-summary-deploy");
  await expect(deployButton).toBeEnabled();
  await deployButton.click();

  await expect(page.getByTestId("preview-deployment-progress-card")).toBeVisible({ timeout: 30_000 });

  const previewLiveCard = page.getByTestId("preview-live-card");
  await expect(previewLiveCard).toBeVisible({ timeout: 150_000 });
  await expect(previewLiveCard).toContainText("Preview is live");

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/registry/services/derived-telemetry-service`);
      if (!response.ok()) return { ok: false };
      const payload = await response.json();
      return {
        ok: true,
        deploymentStatus: payload.deploymentStatus,
        healthStatus: payload.healthStatus,
        branch: payload.branch,
      };
    }, { timeout: 120_000 })
    .toMatchObject({
      ok: true,
      deploymentStatus: "healthy",
      healthStatus: "passing",
      branch: "preview/derived-telemetry-preview",
    });

  const revertButton = previewLiveCard.getByTestId("preview-live-revert");
  await expect(revertButton).toBeEnabled();
  await revertButton.click();

  await expect(page.getByTestId("revert-progress-card")).toBeVisible({ timeout: 30_000 });

  const baselineCard = page.getByTestId("baseline-restored-card");
  await expect(baselineCard).toBeVisible({ timeout: 150_000 });
  await expect(baselineCard).toContainText("Baseline restored");

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/registry/services/derived-telemetry-service`);
      if (!response.ok()) return { ok: false };
      const payload = await response.json();
      return {
        ok: true,
        branch: payload.branch,
        deploymentStatus: payload.deploymentStatus,
      };
    }, { timeout: 120_000 })
    .toMatchObject({
      ok: true,
      branch: "main",
      deploymentStatus: "healthy",
    });

  expect(browserErrors).toEqual([]);
});
