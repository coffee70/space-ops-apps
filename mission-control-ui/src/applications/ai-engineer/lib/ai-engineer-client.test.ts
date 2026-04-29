import assert from "node:assert/strict";
import test from "node:test";

import { createConversation, getConversation, listConversations, sendChatMessage } from "./ai-engineer-client";

test("ai-engineer client uses runtime conversation/chat routes only", async () => {
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    urls.push(url);
    if (url.endsWith("/chat")) {
      return new Response("", { status: 200, headers: { "x-agent-run-id": "run-1", "x-request-id": "req-1" } });
    }
    return new Response(JSON.stringify({ id: "conversation-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await createConversation({ title: "Session" });
    await listConversations();
    await getConversation("conversation-1");
    await sendChatMessage({
      conversationId: "conversation-1",
      message: "hello",
      onChunk: () => {},
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(urls.every((url) => url.startsWith("/intelligence/agent/agent/")));
  assert.equal(urls.some((url) => url.includes("/tool-execution")), false);
  assert.equal(urls.some((url) => url.includes("/internal/runtime-services/tool-execution-service")), false);
});
