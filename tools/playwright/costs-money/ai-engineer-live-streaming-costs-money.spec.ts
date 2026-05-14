import { expect, test } from "@playwright/test";

import { appUrl } from "../tests/support/application-routes";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080";
const abortBeforeSend = process.env.PLAYWRIGHT_COSTS_MONEY_ABORT_BEFORE_SEND === "1";

test.describe("COSTS MONEY: AI Engineer live provider diagnostics", () => {
  test("COSTS MONEY: provider reasoning visibly streams before assistant completion", async ({ page }) => {
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
      const reasoningSamples: Array<{ timestamp: string; length: number; preview: string }> = [];
      const getReasoningText = () => {
        const panels = Array.from(document.querySelectorAll('[data-testid="ai-engineer-reasoning-panel"]'));
        const lastPanel = panels[panels.length - 1];
        return lastPanel?.textContent?.trim() ?? "";
      };
      const observer = new MutationObserver(() => {
        const text = getReasoningText();
        if (text.length === 0) return;
        reasoningSamples.push({
          timestamp: new Date().toISOString(),
          length: text.length,
          preview: text.slice(0, 80),
        });
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      window.__aiEngineerReasoningDiagnostics = { reasoningSamples };
    });

    await page
      .getByTestId("ai-engineer-chat-input")
      .fill(
        "Think through the key responsibilities of an AI engineer inside a spacecraft operations platform, then answer with a concise explanation that takes a few seconds to generate.",
      );
    await page.getByRole("button", { name: "Send message" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("conversation_id"), { timeout: 30_000 })
      .not.toBeNull();
    const conversationId = String(new URL(page.url()).searchParams.get("conversation_id"));

    const reasoningPanel = page.getByTestId("ai-engineer-reasoning-panel").last();
    await expect(reasoningPanel).toBeVisible({ timeout: 45_000 });
    await expect(reasoningPanel).toContainText(/Reasoning summary|Thinking|Reasoning/, { timeout: 45_000 });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const diagnostics = window.__aiEngineerReasoningDiagnostics;
            return diagnostics?.reasoningSamples.some((sample) => sample.length > 40) ?? false;
          }),
        { timeout: 45_000 },
      )
      .toBe(true);

    const reasoningSamplesBeforeCompletion = await page.evaluate(
      () => window.__aiEngineerReasoningDiagnostics?.reasoningSamples ?? [],
    );
    const panelTextBeforeCompletion = (await reasoningPanel.textContent())?.trim() ?? "";
    expect(panelTextBeforeCompletion.length).toBeGreaterThan(40);

    await expect(page.getByText("Run completed").first()).toBeVisible({ timeout: 60_000 });

    const detailResponse = await page.request.get(`${baseUrl}/intelligence/agent/conversations/${conversationId}`);
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    const messages = Array.isArray(detail.messages) ? detail.messages : [];
    const finalAssistantMessage = messages.findLast((message) => message.role === "assistant");
    expect(String(finalAssistantMessage?.content ?? "").trim().length).toBeGreaterThan(0);

    const incrementalReasoningSamples = reasoningSamplesBeforeCompletion.filter((sample) => sample.length > 40);
    expect(incrementalReasoningSamples.length).toBeGreaterThan(0);
    expect(clientStreamLogs.length).toBeGreaterThan(0);
    expect(responseEvents.length).toBeGreaterThan(0);
    expect(browserErrors).toEqual([]);

    console.info(
      "[costs-money] reasoning samples before completion",
      JSON.stringify({
        conversationId,
        clientStreamLogs: clientStreamLogs.length,
        responseEvents,
        samples: incrementalReasoningSamples.slice(0, 12),
      }),
    );
  });
});

declare global {
  interface Window {
    __aiEngineerReasoningDiagnostics?: {
      reasoningSamples: Array<{ timestamp: string; length: number; preview: string }>;
    };
  }
}
