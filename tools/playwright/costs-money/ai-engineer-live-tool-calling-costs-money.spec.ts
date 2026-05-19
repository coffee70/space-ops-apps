import { expect, test } from "@playwright/test";

import { appUrl } from "../tests/support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";
const abortBeforeSend = process.env.PLAYWRIGHT_COSTS_MONEY_ABORT_BEFORE_SEND === "1";

test.describe("COSTS MONEY: AI Engineer live provider tool calling", () => {
  test("COSTS MONEY: provider can call a read tool end to end", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto(`${appUrl("ai-engineer")}?debugAiEngineerStream=1`);
    await expect(page.getByTestId("ai-engineer-shell")).toBeVisible();
    await expect(page.getByTestId("ai-engineer-composer")).toBeVisible();

    if (abortBeforeSend) {
      test.info().annotations.push({
        type: "aborted-before-provider-call",
        description: "PLAYWRIGHT_COSTS_MONEY_ABORT_BEFORE_SEND=1 stopped before clicking Send.",
      });
      return;
    }

    await page.getByTestId("ai-engineer-new-chat-button").click();
    await expect(page.getByText("Run completed")).toHaveCount(0);

    await page
      .getByTestId("ai-engineer-chat-input")
      .fill(
        "Use the list_platform_applications tool exactly once. Do not answer from memory. After the tool result arrives, answer with one short sentence confirming that you inspected the registered platform applications.",
      );
    await page.getByRole("button", { name: "Send message" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("conversation_id"), { timeout: 30_000 })
      .not.toBeNull();
    const conversationId = String(new URL(page.url()).searchParams.get("conversation_id"));

    await expect(page.getByText("Run completed")).toHaveCount(1, { timeout: 60_000 });

    const detailResponse = await page.request.get(`${baseUrl}/intelligence/agent/conversations/${conversationId}`);
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    const events = Array.isArray(detail.events) ? detail.events : [];
    const messages = Array.isArray(detail.messages) ? detail.messages : [];

    expect(events.some((event) => event.event_type === "run.failed")).toBe(false);
    expect(events.some((event) => event.event_type === "run.completed")).toBe(true);
    expect(
      events.some(
        (event) => event.event_type === "tool.started" && event.payload?.tool_name === "list_platform_applications",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) => event.event_type === "tool.completed" && event.payload?.tool_name === "list_platform_applications",
      ),
    ).toBe(true);

    const finalAssistantMessage = messages.findLast((message) => message.role === "assistant");
    expect(String(finalAssistantMessage?.content ?? "").trim().length).toBeGreaterThan(0);
  });
});
