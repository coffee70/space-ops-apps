import { expect, test } from "@playwright/test";

import { appUrl } from "../tests/support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";
const abortBeforeSend = process.env.PLAYWRIGHT_COSTS_MONEY_ABORT_BEFORE_SEND === "1";

test.describe("COSTS MONEY: AI Engineer live provider diagnostics", () => {
  test("COSTS MONEY: assistant answer text visibly streams before completion", async ({ page }) => {
    test.setTimeout(90_000);

    const browserErrors: string[] = [];
    const clientStreamLogs: string[] = [];
    const responseEvents: string[] = [];

    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("[ai-engineer-client] ndjson line received")) {
        clientStreamLogs.push(text);
      }
      if (message.type() === "error") {
        browserErrors.push(`console:${text}`);
      }
    });
    page.on("pageerror", (error) => {
      browserErrors.push(`pageerror:${error.message}`);
    });
    page.on("response", (response) => {
      if (response.url().includes("/intelligence/agent/chat")) {
        responseEvents.push(`${new Date().toISOString()} ${response.status()} ${response.url()}`);
      }
    });

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

    await page.evaluate(() => {
      const samples: Array<{ timestamp: string; length: number; preview: string }> = [];
      const getAssistantText = () => {
        const messages = Array.from(document.querySelectorAll('[data-testid="ai-engineer-message-assistant"]'));
        const lastMessage = messages[messages.length - 1];
        return lastMessage?.textContent?.trim() ?? "";
      };
      const observer = new MutationObserver(() => {
        const text = getAssistantText();
        samples.push({
          timestamp: new Date().toISOString(),
          length: text.length,
          preview: text.slice(0, 80),
        });
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      window.__aiEngineerStreamingDiagnostics = { samples };
    });

    await page
      .getByTestId("ai-engineer-chat-input")
      .fill(
        "Write a concise but multi-paragraph explanation of what a satellite telemetry pipeline does, with enough detail to take a few seconds to generate.",
      );
    await page.getByRole("button", { name: "Send message" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("conversation_id"), { timeout: 30_000 })
      .not.toBeNull();
    const conversationId = String(new URL(page.url()).searchParams.get("conversation_id"));

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const diagnostics = window.__aiEngineerStreamingDiagnostics;
            return diagnostics?.samples.some((sample) => sample.length > "Thinking...".length + 20) ?? false;
          }),
        { timeout: 30_000 },
      )
      .toBe(true);

    const samplesBeforeCompletion = await page.evaluate(() => window.__aiEngineerStreamingDiagnostics?.samples ?? []);
    await expect(page.getByText("run.completed")).toBeVisible({ timeout: 60_000 });

    const detailResponse = await page.request.get(`${baseUrl}/intelligence/agent/conversations/${conversationId}`);
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    const messages = Array.isArray(detail.messages) ? detail.messages : [];
    const finalAssistantMessage = messages.findLast((message) => message.role === "assistant");
    expect(String(finalAssistantMessage?.content ?? "").trim().length).toBeGreaterThan(0);

    const incrementalSamples = samplesBeforeCompletion.filter((sample) => sample.length > "Thinking...".length + 20);
    expect(incrementalSamples.length).toBeGreaterThan(0);
    expect(clientStreamLogs.length).toBeGreaterThan(0);
    expect(responseEvents.length).toBeGreaterThan(0);
    expect(browserErrors).toEqual([]);

    console.info(
      "[costs-money] streaming samples before completion",
      JSON.stringify({
        conversationId,
        clientStreamLogs: clientStreamLogs.length,
        responseEvents,
        samples: incrementalSamples.slice(0, 12),
      }),
    );
  });
});

declare global {
  interface Window {
    __aiEngineerStreamingDiagnostics?: {
      samples: Array<{ timestamp: string; length: number; preview: string }>;
    };
  }
}
