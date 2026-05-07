import { expect, test } from "@playwright/test";

/**
 * WebSocket upgrade must succeed on the browser-facing origin (edge proxy), not only on :8000.
 */
test("edge proxy websocket hello_ack @smoke @edge-proxy", async ({ page }) => {
  await page.goto("/");

  const ackText = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/telemetry/realtime/ws`;
      const socket = new WebSocket(url);
      const seenTypes: string[] = [];

      const timer = window.setTimeout(() => {
        socket.close();
        reject(
          new Error(
            `websocket hello_ack timeout; saw message types: ${seenTypes.join(", ") || "(none)"}`
          )
        );
      }, 20_000);

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "hello", client_version: "1.0" }));
      });

      socket.addEventListener("message", (event) => {
        const text = String(event.data);
        try {
          const payload = JSON.parse(text) as { type?: string };
          if (payload.type) seenTypes.push(payload.type);
          if (payload.type === "hello_ack") {
            window.clearTimeout(timer);
            socket.close();
            resolve(text);
          }
        } catch {
          seenTypes.push("unparseable");
        }
      });

      socket.addEventListener("error", () => {
        window.clearTimeout(timer);
        reject(new Error("websocket error"));
      });
    });
  });

  const payload = JSON.parse(ackText) as { type?: string };
  expect(payload.type).toBe("hello_ack");
});
