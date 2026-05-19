import { expect, test } from "@playwright/test";

import { appUrl } from "./support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";

test("AI Engineer can send a chat message through the live stack", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror:${error.message}`);
  });

  await page.goto(appUrl("ai-engineer"));

  await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
  await expect(page.getByTestId("ai-engineer-shell").getByText("AI Engineer", { exact: true })).toBeVisible();
  await expect(page.getByTestId("ai-engineer-activity-panel")).toBeVisible();
  await expect(page.getByTestId("ai-engineer-composer")).toBeVisible();
  await page.getByTestId("ai-engineer-new-chat-button").click();

  await page.getByTestId("ai-engineer-chat-input").fill("Say whether fallback mode is active.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect
    .poll(() => new URL(page.url()).searchParams.get("conversation_id"), { timeout: 30_000 })
    .not.toBeNull();
  const conversationId = String(new URL(page.url()).searchParams.get("conversation_id"));

  const activityPanel = page.getByTestId("ai-engineer-activity-panel");
  await expect(activityPanel.getByText("Run started", { exact: true })).toBeVisible();
  await expect(activityPanel.getByText("Run completed", { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/intelligence/agent/conversations/${conversationId}`);
      if (!response.ok()) {
        return { ok: false, messageCount: -1, lastRole: null, lastContentLength: 0 };
      }
      const detail = await response.json();
      const messages = Array.isArray(detail.messages) ? detail.messages : [];
      const lastMessage = messages[messages.length - 1] ?? null;
      return {
        ok: true,
        messageCount: messages.length,
        lastRole: lastMessage?.role ?? null,
        lastContentLength: typeof lastMessage?.content === "string" ? lastMessage.content.trim().length : 0,
      };
    }, { timeout: 30_000 })
    .toMatchObject({
      ok: true,
      messageCount: 2,
      lastRole: "assistant",
    });

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/intelligence/agent/conversations/${conversationId}`);
      if (!response.ok()) {
        return 0;
      }
      const detail = await response.json();
      const messages = Array.isArray(detail.messages) ? detail.messages : [];
      const lastMessage = messages[messages.length - 1] ?? null;
      return typeof lastMessage?.content === "string" ? lastMessage.content.trim().length : 0;
    }, { timeout: 30_000 })
    .toBeGreaterThan(0);

  const detailResponse = await page.request.get(`${baseUrl}/intelligence/agent/conversations/${conversationId}`);
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json();
  expect(detail.messages).toHaveLength(2);
  expect(detail.messages[0].role).toBe("user");
  expect(detail.messages[1].role).toBe("assistant");
  expect(String(detail.messages[1].content).trim().length).toBeGreaterThan(0);

  const assistantMessage = page.getByTestId("ai-engineer-assistant-message").last();
  const visibleAssistantLine = String(detail.messages[1].content)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .split(/\n+/)
    .map((line) => line.replace(/^- /, "").trim())
    .find((line) => line.length > 0);
  expect(visibleAssistantLine).toBeTruthy();
  await expect(assistantMessage.getByText(String(visibleAssistantLine), { exact: true })).toBeVisible();
  await expect(page.getByText("No activity yet.")).toHaveCount(0);

  expect(browserErrors).toEqual([]);
});
