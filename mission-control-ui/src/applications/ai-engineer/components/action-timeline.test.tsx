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

test("ActionTimeline renders friendly activity cards with raw event details collapsed", () => {
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

  assert.match(markup, /Tool completed/);
  assert.match(markup, /Run started/);
  assert.match(markup, /Raw event/);
  assert.doesNotMatch(markup, /<details[^>]* open/);
});

test("ActionTimeline renders document, code, and navigation lifecycle events in the same run", () => {
  const markup = renderToStaticMarkup(
    <ActionTimeline
      events={[
        buildEvent({ id: "e1", event_type: "document.ingestion_completed", sequence: 1, emitted_by: "document-knowledge-service", payload: { document_id: "doc-1", chunk_count: 1, embedding_model: "fixture", duration_ms: 0 } }),
        buildEvent({ id: "e2", event_type: "code.index_completed", sequence: 2, emitted_by: "code-intelligence-service", payload: { repository: "phase3-test-fixture-service", branch: "main", commit_sha: "abc1234", file_count: 1, chunk_count: 1, duration_ms: 0 } }),
        buildEvent({ id: "e3", event_type: "navigation.requested", sequence: 3, emitted_by: "tool-execution-service", tool_call_id: "tool-nav-1", payload: { action: "navigate_to_application", application_id: "ai-engineer", route_path: "/apps/ai-engineer" } }),
      ]}
    />,
  );

  assert.match(markup, /Document ready/);
  assert.match(markup, /Code index complete/);
  assert.match(markup, /Navigation requested/);
  assert.match(markup, /tool-nav/);
});
