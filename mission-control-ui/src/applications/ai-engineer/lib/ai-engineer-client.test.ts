import assert from "node:assert/strict";
import test from "node:test";

import { createConversation, getConversation, listConversations, sendChatMessage, uploadDocument } from "./ai-engineer-client";

function pathnameOfFetchUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

test("ai-engineer client uses clean gateway routes for agent, chat, and document upload", async () => {
  const FileCtor =
    globalThis.File ??
    class extends Blob {
      readonly name: string;

      constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
        super(parts, options);
        this.name = name;
      }
    };
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    urls.push(url);
    if (url.endsWith("/chat")) {
      return new Response("", { status: 200, headers: { "x-agent-run-id": "run-1", "x-request-id": "req-1" } });
    }
    return new Response(JSON.stringify({ id: "conversation-1", document_id: "doc-1" }), {
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
    const file = new FileCtor(["hello"], "note.txt", { type: "text/plain" });
    await uploadDocument({ file });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const agentUrls = urls.filter((url) => url.includes("/intelligence/agent/"));
  assert.ok(agentUrls.every((url) => pathnameOfFetchUrl(url).startsWith("/intelligence/agent/")));
  assert.equal(
    urls.filter((url) => pathnameOfFetchUrl(url) === "/intelligence/documents").length,
    1,
  );
  assert.equal(urls.some((url) => url.includes("/intelligence/documents/documents")), false);
  assert.equal(urls.some((url) => url.includes("/tool-execution")), false);
  assert.equal(urls.some((url) => url.includes("/internal/runtime-services/tool-execution-service")), false);
});

test("sendChatMessage JSON body includes model_id when modelId is provided", async () => {
  let captured: string | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    captured = typeof init?.body === "string" ? init.body : null;
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      { status: 200, headers: { "x-agent-run-id": "run-x", "x-request-id": "req-x" } },
    );
  }) as typeof fetch;

  try {
    await sendChatMessage({
      conversationId: "conv-1",
      message: "ping",
      modelId: "openai-gpt-5-5",
      onChunk: () => {},
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(captured);
  const body = JSON.parse(captured!) as { model_id?: string; conversation_id?: string };
  assert.equal(body.model_id, "openai-gpt-5-5");
  assert.equal(body.conversation_id, "conv-1");
});

test("sendChatMessage omits model_id when modelId is undefined", async () => {
  let captured: string | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    captured = typeof init?.body === "string" ? init.body : null;
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      { status: 200, headers: { "x-agent-run-id": "run-x", "x-request-id": "req-x" } },
    );
  }) as typeof fetch;

  try {
    await sendChatMessage({
      conversationId: "conv-1",
      message: "ping",
      onChunk: () => {},
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(captured);
  const body = JSON.parse(captured!) as Record<string, unknown>;
  assert.equal(body.model_id, undefined);
  assert.ok(!Object.prototype.hasOwnProperty.call(body, "model_id"));
});
