import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ActionTimeline } from "./action-timeline";
import type { ChatEvent } from "../types";

function buildEvent(overrides: Partial<ChatEvent>): ChatEvent {
  return {
    id: overrides.id ?? "event-1",
    event_type: overrides.event_type ?? "run.started",
    conversation_id: overrides.conversation_id ?? "conversation-1",
    agent_run_id: overrides.agent_run_id ?? "run-1",
    request_id: overrides.request_id ?? "request-1",
    tool_call_id: overrides.tool_call_id ?? null,
    sequence: overrides.sequence ?? 1,
    emitted_by: overrides.emitted_by ?? "agent-runtime-service",
    payload: overrides.payload ?? {},
    created_at: overrides.created_at ?? "2026-04-29T00:00:00.000Z",
  };
}

test("ActionTimeline renders events grouped by run, ordered by sequence, and correlated by tool_call_id", () => {
  const markup = renderToStaticMarkup(
    <ActionTimeline
      events={[
        buildEvent({ id: "e3", event_type: "tool.completed", sequence: 3, tool_call_id: "tool-1" }),
        buildEvent({ id: "e2", event_type: "tool.started", sequence: 2, tool_call_id: "tool-1" }),
        buildEvent({ id: "e1", event_type: "run.started", sequence: 1 }),
        buildEvent({ id: "e4", event_type: "run.started", sequence: 1, agent_run_id: "run-2", request_id: "request-2" }),
      ]}
    />,
  );

  assert.match(markup, /Run run-1/);
  assert.match(markup, /Run run-2/);
  assert.ok(markup.indexOf("1. run.started") < markup.indexOf("2. tool.started"));
  assert.ok(markup.indexOf("2. tool.started") < markup.indexOf("3. tool.completed"));
  assert.match(markup, /Tools: tool-1 completed/);
});
