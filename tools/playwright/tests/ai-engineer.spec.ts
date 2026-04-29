import { expect, test } from "@playwright/test";

import { appUrl } from "./support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

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

  const createResponse = await page.request.post(`${baseUrl}/intelligence/agent/agent/conversations`, {
    data: {
      title: `AI Engineer Playwright ${Date.now()}`,
      execution_mode: "read_only",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdConversation = await createResponse.json();
  const conversationId = String(createdConversation.id);

  await page.goto(appUrl("ai-engineer"));

  await expect(page.getByRole("heading", { name: "AI Engineer" })).toBeVisible();
  await expect(page.getByText("Action Timeline")).toBeVisible();
  await expect(page.locator("textarea")).toBeVisible();

  await page.locator("textarea").fill("Say whether fallback mode is active.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("run.started")).toBeVisible();
  await expect(page.getByText("run.completed")).toBeVisible({ timeout: 30_000 });

  await expect
    .poll(async () => {
      const response = await page.request.get(`${baseUrl}/intelligence/agent/agent/conversations/${conversationId}`);
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
      const response = await page.request.get(`${baseUrl}/intelligence/agent/agent/conversations/${conversationId}`);
      if (!response.ok()) {
        return 0;
      }
      const detail = await response.json();
      const messages = Array.isArray(detail.messages) ? detail.messages : [];
      const lastMessage = messages[messages.length - 1] ?? null;
      return typeof lastMessage?.content === "string" ? lastMessage.content.trim().length : 0;
    }, { timeout: 30_000 })
    .toBeGreaterThan(0);

  const detailResponse = await page.request.get(`${baseUrl}/intelligence/agent/agent/conversations/${conversationId}`);
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json();
  expect(detail.messages).toHaveLength(2);
  expect(detail.messages[0].role).toBe("user");
  expect(detail.messages[1].role).toBe("assistant");
  expect(String(detail.messages[1].content).trim().length).toBeGreaterThan(0);

  await expect(page.getByText(String(detail.messages[1].content).trim().slice(0, 60))).toBeVisible();
  await expect(page.getByText("No events yet.")).toHaveCount(0);

  expect(browserErrors).toEqual([]);
});
