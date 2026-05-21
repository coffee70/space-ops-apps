import assert from "node:assert/strict";
import test from "node:test";

import { approveToolPermission, denyToolPermission } from "./tool-permission-client";

function permissionResponse(status = "approved") {
  return {
    permission_request_id: "permission-1",
    tool_call_id: "tool-call-1",
    status,
    response_json: null,
  };
}

test("approveToolPermission posts without an approval token body", async () => {
  const calls: RequestInit[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(JSON.stringify(permissionResponse()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await approveToolPermission("permission-1");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "POST");
  assert.equal(calls[0]?.body, undefined);
});

test("denyToolPermission posts only the denial reason", async () => {
  const calls: RequestInit[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(JSON.stringify(permissionResponse("denied")), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await denyToolPermission("permission-1", "user_denied");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.body ?? "{}")), { reason: "user_denied" });
});
