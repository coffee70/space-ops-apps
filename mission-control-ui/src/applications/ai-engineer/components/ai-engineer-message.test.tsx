import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerMessage } from "./ai-engineer-message";
import type { ChatEvent, ChatMessage, ChatMessageToolPermissionPart } from "../types";

function permissionMessage(overrides: Partial<ChatMessageToolPermissionPart> = {}): ChatMessage {
  return {
    id: "m1",
    role: "assistant",
    content: "",
    status: "complete",
    part: {
      kind: "tool-permission",
      permissionRequestId: "permission-1",
      toolCallId: "44444444-4444-4444-4444-444444444444",
      toolName: "deploy_preview_change",
      prompt: {
        title: "Deploy preview changes?",
        description: "The AI Engineer wants to deploy mission-control-frontend-shell.",
        primary_action: "Deploy changes",
        secondary_action: "Cancel",
        details: {
          branch: "preview/cyan",
          target_unit_id: "mission-control-frontend-shell",
          target_application_id: "telemetry",
        },
      },
      ...overrides,
    },
  };
}

function event(event_type: string, payload: Record<string, unknown>): ChatEvent {
  return {
    id: `event-${event_type}`,
    event_type,
    conversation_id: "conversation-1",
    agent_run_id: "run-1",
    request_id: "request-1",
    tool_call_id: "44444444-4444-4444-4444-444444444444",
    sequence: 1,
    emitted_by: "tool-execution-service",
    payload,
    created_at: "2026-05-21T00:00:00.000Z",
  };
}

test("AiEngineerMessage renders thinking state for empty streaming assistant messages", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "assistant", content: "", status: "streaming" }} />,
  );

  assert.match(markup, /data-testid="ai-engineer-message-assistant"/);
  assert.match(markup, /data-testid="ai-engineer-assistant-message"/);
  assert.match(markup, /Thinking\.\.\./);
  assert.match(markup, /shimmer-text/);
});

test("AiEngineerMessage renders streaming assistant content instead of thinking state", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "assistant", content: "Runtime response", status: "streaming" }} />,
  );

  assert.match(markup, /Runtime response/);
  assert.match(markup, /ai-engineer-streaming-assistant/);
  assert.doesNotMatch(markup, /Thinking\.\.\./);
});

test("AiEngineerMessage does not render generic tool-role result cards", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "tool", content: "Tool output", status: "complete" }} />,
  );

  assert.equal(markup, "");
  assert.doesNotMatch(markup, /Tool result/);
  assert.doesNotMatch(markup, /Tool output/);
  assert.doesNotMatch(markup, /data-role="tool"/);
});

test("AiEngineerMessage still renders tool permission cards", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage
      message={permissionMessage()}
      events={[]}
    />,
  );

  assert.match(markup, /data-testid="ai-engineer-tool-permission-message"/);
  assert.match(markup, /data-testid="tool-permission-card"/);
  assert.match(markup, /Deploy preview changes\?/);
  assert.match(markup, /mission-control-frontend-shell/);
  assert.match(markup, /Checking permission/);
  assert.doesNotMatch(markup, /Deploy changes/);
  assert.doesNotMatch(markup, /Cancel/);
});

test("AiEngineerMessage renders approved permission cards without progress labels or actions", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage
      message={permissionMessage()}
      events={[
        event("tool.permission_approved", {
          permission_request_id: "permission-1",
          tool_call_id: "44444444-4444-4444-4444-444444444444",
        }),
      ]}
    />,
  );

  assert.match(markup, /data-permission-state="approved"/);
  assert.match(markup, /Approved/);
  assert.doesNotMatch(markup, /Approved - running/);
  assert.doesNotMatch(markup, /Running\.\.\./);
  assert.doesNotMatch(markup, /Deploy changes/);
  assert.doesNotMatch(markup, /Cancel/);
});

test("AiEngineerMessage renders failed permission cards without actions", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage
      message={permissionMessage()}
      events={[
        event("tool.failed", {
          permission_request_id: "permission-1",
          tool_call_id: "44444444-4444-4444-4444-444444444444",
          message: "permission request is failed",
        }),
      ]}
    />,
  );

  assert.match(markup, /data-permission-state="failed"/);
  assert.match(markup, /permission request is failed/);
  assert.doesNotMatch(markup, /Deploy changes/);
  assert.doesNotMatch(markup, /Cancel/);
});
