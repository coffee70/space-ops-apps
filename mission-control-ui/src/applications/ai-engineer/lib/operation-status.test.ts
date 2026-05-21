import assert from "node:assert/strict";
import test from "node:test";

import { getAiEngineerOperationStatus } from "./operation-status";
import type { ChatEvent } from "../types";

function event(event_type: string, payload: Record<string, unknown> = {}): ChatEvent {
  return {
    id: event_type,
    event_type,
    conversation_id: "conversation-1",
    agent_run_id: "run-1",
    request_id: "request-1",
    tool_call_id: null,
    sequence: 1,
    emitted_by: "tool-execution-service",
    payload,
    created_at: "2026-05-21T00:00:00.000Z",
  };
}

test("operation status shows deploying for deployment start events", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("deployment.submitted")]), {
    status: "running",
    label: "Deploying preview...",
  });
});

test("operation status shows failed for deployment failures", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("deployment.failed", { failure_reason: "build failed" })]), {
    status: "failed",
    label: "Preview deploy failed",
  });
});

test("operation status shows preview active for preview active events", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("preview.active")]), {
    status: "success",
    label: "Preview active",
  });
});
