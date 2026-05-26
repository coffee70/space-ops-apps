import { expect, test, type Page } from "@playwright/test";

import { appUrl } from "./support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";
const controlPlaneUrl = process.env.PLAYWRIGHT_CONTROL_PLANE_URL || "http://control-plane:8100";
const previewBranch = "preview/derived-telemetry-preview";

test.setTimeout(180_000);

const now = "2026-05-13T12:00:00.000Z";

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

async function mockAiEngineerConversation(
  page: Page,
  conversation: {
    id: string;
    title: string;
    messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
    events: Array<Record<string, unknown>>;
  },
) {
  await page.route("**/intelligence/agent/models", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        default_model_id: "demo",
        models: [
          {
            id: "demo",
            providerRef: "demo",
            providerType: "openai-compatible",
            providerModelId: "demo",
            name: "Demo model",
            provider: "Demo",
            description: null,
            enabled: true,
            isAvailable: true,
            disabledReason: null,
            isDefault: true,
            defaultFor: ["demo-safe"],
            governance: { allowedModes: ["read_only", "suggest", "execute"], dataBoundary: "unknown" },
            contextWindow: null,
            maxOutputTokens: null,
            inputModalities: ["text"],
            outputModalities: ["text"],
            supportedParameters: [],
            capabilities: ["text"],
            pricing: { inputPerMillionTokens: null, outputPerMillionTokens: null, currency: null },
            qualityTier: "standard",
            costTier: "internal",
            speedTier: "fast",
            reasoningTier: "none",
            recommendedFor: ["demo-safe"],
            metadataSources: ["test"],
          },
        ],
        metadata: { registrySource: "config", metadataResolvers: [], cached: false, updatedAt: now },
      }),
    });
  });
  await page.route("**/intelligence/agent/conversations", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: conversation.id,
          title: conversation.title,
          mission_id: null,
          vehicle_id: null,
          execution_mode: "execute",
          created_at: now,
          updated_at: now,
        },
      ]),
    });
  });
  await page.route(`**/intelligence/agent/conversations/${conversation.id}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: conversation.id,
        title: conversation.title,
        mission_id: null,
        vehicle_id: null,
        execution_mode: "execute",
        created_at: now,
        updated_at: now,
        messages: conversation.messages.map((message) => ({
          ...message,
          conversation_id: conversation.id,
          created_at: now,
        })),
        events: conversation.events,
      }),
    });
  });
}

async function expectInternalTranscriptScroll(page: Page) {
  await expect(page.getByTestId("ai-engineer-chat-input")).toBeVisible();
  await expect(page.getByTestId("ai-engineer-composer")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const transcript = document.querySelector<HTMLElement>('[data-testid="ai-engineer-chat-transcript"]');
    const shell = document.querySelector<HTMLElement>('[data-testid="ai-engineer-shell"]');
    const composer = document.querySelector<HTMLElement>('[data-testid="ai-engineer-composer"]');
    const sidebar = document.querySelector<HTMLElement>('[data-testid="ai-engineer-conversation-sidebar"]');
    const activity = document.querySelector<HTMLElement>('[data-testid="ai-engineer-activity-panel"]');
    window.scrollTo(0, 500);
    transcript?.scrollTo(0, 500);
    return {
      windowScrollY: window.scrollY,
      documentScrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      documentClientHeight: document.scrollingElement?.clientHeight ?? 0,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      transcriptScrollTop: transcript?.scrollTop ?? 0,
      transcriptScrollHeight: transcript?.scrollHeight ?? 0,
      transcriptClientHeight: transcript?.clientHeight ?? 0,
      shellHeight: shell?.getBoundingClientRect().height ?? 0,
      viewportHeight: window.innerHeight,
      composerBottom: composer?.getBoundingClientRect().bottom ?? 0,
      sidebarBottom: sidebar?.getBoundingClientRect().bottom ?? 0,
      activityBottom: activity?.getBoundingClientRect().bottom ?? 0,
    };
  });

  expect(metrics.windowScrollY).toBe(0);
  expect(metrics.documentScrollHeight).toBeLessThanOrEqual(metrics.documentClientHeight + 1);
  expect(metrics.bodyScrollHeight).toBeLessThanOrEqual(metrics.bodyClientHeight + 1);
  expect(metrics.transcriptScrollHeight).toBeGreaterThan(metrics.transcriptClientHeight);
  expect(metrics.transcriptScrollTop).toBeGreaterThan(0);
  expect(metrics.shellHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.composerBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  if (metrics.sidebarBottom > 0) expect(metrics.sidebarBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  if (metrics.activityBottom > 0) expect(metrics.activityBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
}

test("AI Engineer keeps the composer visible when the last message is a large change-preview card", async ({ page }) => {
  const conversationId = "layout-change-preview";
  const changedFiles = Array.from({ length: 80 }, (_, index) => `mission-control-ui/src/generated/long-preview-file-${index}.tsx`);
  await mockAiEngineerConversation(page, {
    id: conversationId,
    title: "Layout regression",
    messages: [
      ...Array.from({ length: 18 }, (_, index) => ({
        id: `layout-msg-${index}`,
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `Layout filler message ${index + 1}. ${"This message gives the transcript enough height to overflow internally. ".repeat(3)}`,
      })),
    ],
    events: [
      {
        id: "layout-change-summary",
        event_type: "change.summary",
        conversation_id: conversationId,
        agent_run_id: "layout-run",
        request_id: "layout-request",
        tool_call_id: null,
        sequence: 1,
        emitted_by: "agent",
        created_at: now,
        payload: {
          branch: "preview/layout-regression",
          base_branch: "main",
          base_commit_sha: "base-sha",
          commit_sha: "preview-sha",
          changed_files: changedFiles,
          target_unit_id: "mission-control-ui",
          target_application_id: "ai-engineer",
          affected_capability: "AI Engineer transcript layout",
          risk_level: "medium",
          validation_status: "passed",
        },
      },
    ],
  });

  await page.goto(appUrl("ai-engineer"));
  await expect(page.getByTestId("ai-engineer-change-preview-message")).toBeVisible();
  await page.getByTestId("change-summary-files-toggle").click();

  await expectInternalTranscriptScroll(page);
});

test("AI Engineer keeps the composer visible and transcript scrollable for text-only conversations", async ({ page }) => {
  const conversationId = "layout-text-only";
  await mockAiEngineerConversation(page, {
    id: conversationId,
    title: "Text layout",
    messages: Array.from({ length: 34 }, (_, index) => ({
      id: `text-msg-${index}`,
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Text-only transcript message ${index + 1}. ${"The composer must stay visible while the transcript scrolls. ".repeat(4)}`,
    })),
    events: [],
  });

  await page.goto(appUrl("ai-engineer"));
  await expect(page.getByTestId("ai-engineer-assistant-message").last()).toBeVisible();

  await expectInternalTranscriptScroll(page);
});

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

  // Prior local runs can leave the scripted preview branch behind, which makes
  // the deterministic create_commit step fail with "no changes to commit".
  const cleanupResponse = await page.request.post(`${controlPlaneUrl}/internal/delete/code`, {
    data: { branch: previewBranch },
  });
  expect(cleanupResponse.ok()).toBeTruthy();

  await page.goto(appUrl("ai-engineer"));

  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await page.getByTestId("ai-engineer-new-chat-button").click();
  await page.getByTestId("ai-engineer-composer").getByRole("button", { name: "Execute", exact: true }).click();

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
