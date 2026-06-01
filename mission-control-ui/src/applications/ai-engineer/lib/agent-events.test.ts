import assert from "node:assert/strict";
import test from "node:test";

import { applyAgentEventToAssistantMessage, groupTimelineEvents, normalizeStreamLine } from "./agent-events";
import type { AgentEvent, ChatMessage } from "../types";

let eventId = 0;

function event(overrides: Partial<AgentEvent>): AgentEvent {
  return {
    id: overrides.id ?? `event-${(eventId += 1)}`,
    event_type: overrides.event_type ?? "run.started",
    conversation_id: overrides.conversation_id ?? "conversation-1",
    agent_run_id: overrides.agent_run_id ?? "run-1",
    request_id: overrides.request_id ?? "request-1",
    tool_call_id: overrides.tool_call_id ?? null,
    sequence: overrides.sequence ?? 1,
    emitted_by: overrides.emitted_by ?? "agent-runtime-service",
    created_at: overrides.created_at ?? "2026-04-29T00:00:00.000Z",
    payload: overrides.payload ?? {},
  };
}

test("parses NDJSON canonical event stream and wrapper shape", () => {
  const canonical = event({ event_type: "message.delta", payload: { text_delta: "hello" } });
  assert.deepEqual(normalizeStreamLine(JSON.stringify(canonical)), canonical);
  assert.deepEqual(normalizeStreamLine(JSON.stringify({ kind: "event", event: canonical })), canonical);
  assert.throws(() => normalizeStreamLine(JSON.stringify({ kind: "message.delta", delta: "fake" })), /agent event/i);
});

test("assistant text updates and completes only from backend message events", () => {
  const draft: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  const afterDelta = applyAgentEventToAssistantMessage(draft, "draft", event({ event_type: "message.delta", payload: { text_delta: "Hello" } }));
  assert.equal(afterDelta[0].content, "Hello");

  const afterComplete = applyAgentEventToAssistantMessage(afterDelta, "draft", event({ event_type: "message.completed", payload: { message_id: "assistant-1" } }));
  assert.equal(afterComplete[0].id, "assistant-1");
  assert.equal(afterComplete[0].status, "complete");
});

test("assistant text resumes after tool activity with one paragraph boundary", () => {
  const draft: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  const firstDelta = applyAgentEventToAssistantMessage(
    draft,
    "draft",
    event({ event_type: "message.delta", payload: { text_delta: "I will inspect this." }, sequence: 1 }),
  );
  const afterToolStart = applyAgentEventToAssistantMessage(
    firstDelta,
    "draft",
    event({ event_type: "tool.started", tool_call_id: "tool-1", payload: { tool_name: "read_source_file" }, sequence: 2 }),
  );
  const afterToolComplete = applyAgentEventToAssistantMessage(
    afterToolStart,
    "draft",
    event({ event_type: "tool.completed", tool_call_id: "tool-1", payload: { tool_name: "read_source_file" }, sequence: 3 }),
  );
  const resumed = applyAgentEventToAssistantMessage(
    afterToolComplete,
    "draft",
    event({ event_type: "message.delta", payload: { text_delta: "The relevant file is updated." }, sequence: 4 }),
  );

  assert.equal(resumed[0].content, "I will inspect this.\n\nThe relevant file is updated.");
  assert.equal(resumed[0].pendingToolTextBoundary, false);
});

test("assistant text does not double separate when backend delta already includes a paragraph boundary", () => {
  let messages: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: "Before tools." }, sequence: 1 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.completed", tool_call_id: "tool-1", sequence: 2 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: "\n\nAfter tools." }, sequence: 3 }));

  assert.equal(messages[0].content, "Before tools.\n\nAfter tools.");
});

test("multiple tool events between assistant text deltas create only one boundary", () => {
  let messages: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: "Before tools." }, sequence: 1 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.started", tool_call_id: "tool-1", sequence: 2 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.completed", tool_call_id: "tool-1", sequence: 3 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.started", tool_call_id: "tool-2", sequence: 4 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.completed", tool_call_id: "tool-2", sequence: 5 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: "After tools." }, sequence: 6 }));

  assert.equal(messages[0].content, "Before tools.\n\nAfter tools.");
});

test("tool activity before first assistant text does not add leading whitespace", () => {
  let messages: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.started", tool_call_id: "tool-1", sequence: 1 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "tool.completed", tool_call_id: "tool-1", sequence: 2 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: "First text." }, sequence: 3 }));

  assert.equal(messages[0].content, "First text.");
});

test("consecutive assistant text deltas without tool activity remain continuous", () => {
  let messages: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: "Hello" }, sequence: 1 }));
  messages = applyAgentEventToAssistantMessage(messages, "draft", event({ event_type: "message.delta", payload: { text_delta: " world" }, sequence: 2 }));

  assert.equal(messages[0].content, "Hello world");
});

test("run.failed displays backend error payload", () => {
  const draft: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  const failed = applyAgentEventToAssistantMessage(draft, "draft", event({ event_type: "run.failed", payload: { error_code: "failed", message: "backend failed" } }));
  assert.equal(failed[0].content, "backend failed");
  assert.equal(failed[0].status, "complete");
});

test("run.failed displays friendly provider interruption messages for empty assistant content", () => {
  const cases = [
    {
      error_code: "model_provider_rate_limited",
      expected: "provider throughput limit",
    },
    {
      error_code: "model_provider_overloaded",
      expected: "temporarily overloaded",
    },
    {
      error_code: "model_provider_network_transient",
      expected: "transient network/provider issue",
    },
    {
      error_code: "model_context_length_exceeded",
      expected: "context limit",
    },
  ];

  for (const { error_code, expected } of cases) {
    const draft: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
    const failed = applyAgentEventToAssistantMessage(
      draft,
      "draft",
      event({
        event_type: "run.failed",
        payload: {
          error_code,
          category: error_code === "model_context_length_exceeded" ? "context_length_exceeded" : "rate_limited",
          retryable: error_code !== "model_context_length_exceeded",
          message: "raw provider detail",
        },
      }),
    );
    assert.match(failed[0].content, new RegExp(expected));
  }
});

test("malformed enriched run.failed falls back without breaking streaming state", () => {
  const draft: ChatMessage[] = [{ id: "draft", role: "assistant", content: "", status: "streaming" }];
  const failed = applyAgentEventToAssistantMessage(
    draft,
    "draft",
    event({ event_type: "run.failed", payload: { error_code: 123, message: "generic fallback" } }),
  );
  assert.equal(failed[0].content, "generic fallback");
  assert.equal(failed[0].status, "complete");
});

test("run.cancelled preserves partial assistant output and finalizes reasoning state", () => {
  const draft: ChatMessage[] = [
    {
      id: "draft",
      role: "assistant",
      content: "partial answer",
      status: "streaming",
      reasoning: {
        content: "partial reasoning",
        status: "streaming",
        representation: "reasoning_summary",
        source: "provider_exposed",
      },
    },
  ];
  const cancelled = applyAgentEventToAssistantMessage(draft, "draft", event({ event_type: "run.cancelled", payload: { reason: "user_requested_stop" } }));
  assert.equal(cancelled[0].content, "partial answer");
  assert.equal(cancelled[0].status, "complete");
  assert.equal(cancelled[0].reasoning?.content, "partial reasoning");
  assert.equal(cancelled[0].reasoning?.status, "complete");
});

test("timeline groups by run, orders by sequence, and correlates tools by tool_call_id", () => {
  const groups = groupTimelineEvents([
    event({ id: "complete", event_type: "tool.completed", agent_run_id: "run-1", tool_call_id: "tool-1", sequence: 3 }),
    event({ id: "started", event_type: "tool.started", agent_run_id: "run-1", tool_call_id: "tool-1", sequence: 2 }),
    event({ id: "run-started", event_type: "run.started", agent_run_id: "run-1", sequence: 1 }),
    event({ id: "other-run", event_type: "run.started", agent_run_id: "run-2", sequence: 1 }),
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.find((group) => group.agentRunId === "run-1")?.events.map((item) => item.id),
    ["run-started", "started", "complete"],
  );
  assert.equal(groups.find((group) => group.agentRunId === "run-1")?.tools[0].toolCallId, "tool-1");
  assert.equal(groups.find((group) => group.agentRunId === "run-1")?.tools[0].latestStatus, "completed");
});
