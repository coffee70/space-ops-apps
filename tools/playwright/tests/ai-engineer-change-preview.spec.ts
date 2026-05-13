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

  // Capture the exact baseline commit SHA from the currently-active deployment
  // of the target service. The revert MUST restore this SHA, not whatever
  // `main` happens to be after the preview branch advances.
  const baselineRegistryResponse = await page.request.get(
    `${baseUrl}/registry/services/derived-telemetry-service`,
  );
  expect(baselineRegistryResponse.ok()).toBeTruthy();
  const baselineRegistry = await baselineRegistryResponse.json();
  expect(baselineRegistry.branch).toBe("main");
  const baselineCommitSha: string = baselineRegistry.commitSha ?? baselineRegistry.commit_sha;
  expect(typeof baselineCommitSha).toBe("string");
  expect(baselineCommitSha.length).toBeGreaterThan(0);

  await page.goto(appUrl("ai-engineer"));

  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await page.getByTestId("ai-engineer-composer").getByRole("button", { name: "Execute" }).click();

  await fillAndSend(page, "[scripted:scripted_change_preview] Prepare a scoped change preview.");

  // The deploy/revert lifecycle must render as an assistant-owned chat message,
  // not a detached preview lane below the message stream.
  const previewMessage = page.getByTestId("ai-engineer-change-preview-message").first();
  await expect(previewMessage).toBeVisible({ timeout: 60_000 });

  const summaryCard = previewMessage.getByTestId("change-summary-card");
  await expect(summaryCard).toBeVisible({ timeout: 60_000 });
  await expect(summaryCard).toContainText("Ready to preview changes");
  await expect(summaryCard).toContainText("preview/derived-telemetry-preview");

  const deployButton = previewMessage.getByTestId("change-summary-deploy");
  await expect(deployButton).toBeEnabled();
  await deployButton.click();

  await expect(previewMessage.getByTestId("preview-deployment-progress-card")).toBeVisible({
    timeout: 30_000,
  });

  const previewLiveCard = previewMessage.getByTestId("preview-live-card");
  await expect(previewLiveCard).toBeVisible({ timeout: 150_000 });
  await expect(previewLiveCard).toContainText("Preview is live");
  // The scripted preview supplies a target_application_id ("telemetry"), so the
  // Open app button should be visible on the preview-live card.
  await expect(previewLiveCard.getByTestId("preview-live-open-app")).toBeVisible();

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

  await expect(previewMessage.getByTestId("revert-progress-card")).toBeVisible({ timeout: 30_000 });

  const baselineCard = previewMessage.getByTestId("baseline-restored-card");
  await expect(baselineCard).toBeVisible({ timeout: 150_000 });
  await expect(baselineCard).toContainText("Baseline restored");

  // The revert deployment must record the exact baseline commit SHA captured
  // before the preview started, not just "the latest commit on main".
  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/registry/services/derived-telemetry-service`);
      if (!response.ok()) return { ok: false };
      const payload = await response.json();
      return {
        ok: true,
        branch: payload.branch,
        deploymentStatus: payload.deploymentStatus,
        commitSha: payload.commitSha ?? payload.commit_sha ?? null,
      };
    }, { timeout: 120_000 })
    .toMatchObject({
      ok: true,
      branch: "main",
      deploymentStatus: "healthy",
      commitSha: baselineCommitSha,
    });

  expect(browserErrors).toEqual([]);
});
