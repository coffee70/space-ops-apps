import assert from "node:assert/strict";
import test from "node:test";

import { serializeAiEngineerTranscript } from "./transcript";
import type { ChatEvent, ChatMessage, ChatMessageToolPermissionPart } from "@/applications/ai-engineer/types";

function event(overrides: Partial<ChatEvent> = {}): ChatEvent {
  return {
    id: overrides.id ?? `event-${overrides.sequence ?? 1}`,
    event_type: overrides.event_type ?? "tool.completed",
    conversation_id: overrides.conversation_id ?? "conversation-1",
    agent_run_id: overrides.agent_run_id ?? "run-1",
    request_id: overrides.request_id ?? "request-1",
    tool_call_id: overrides.tool_call_id ?? "tool-1",
    sequence: overrides.sequence ?? 1,
    emitted_by: overrides.emitted_by ?? "agent-runtime-service",
    payload: overrides.payload ?? {},
    created_at: overrides.created_at ?? `2026-05-27T12:00:0${overrides.sequence ?? 1}Z`,
  };
}

function indexes(transcript: string, values: string[]): number[] {
  return values.map((value) => {
    const index = transcript.indexOf(value);
    assert.notEqual(index, -1, `expected transcript to contain ${value}`);
    return index;
  });
}

test("messages-only copies assistant content when assistant message has permission parts", () => {
  const permissionPart: ChatMessageToolPermissionPart = {
    kind: "tool-permission",
    permissionRequestId: "permission-1",
    toolCallId: "tool-1",
    toolName: "deploy_preview_change",
    status: "pending",
    prompt: { title: "Deploy change" },
  };
  const messages: ChatMessage[] = [
    {
      id: "m1",
      role: "assistant",
      content: "I need approval to deploy.",
      parts: [permissionPart],
    },
  ];

  const transcript = serializeAiEngineerTranscript(messages, [event({ payload: { tool_name: "deploy_preview_change" } })], "messages-only");

  assert.match(transcript, /I need approval to deploy\./);
  assert.doesNotMatch(transcript, /### Tool:/);
});

test("include-tools interleaves matched tool summaries instead of appending a global appendix", () => {
  const messages: ChatMessage[] = [
    { id: "u1", role: "user", content: "Please inspect telemetry code.", requestId: "request-1", agentRunId: "run-1", sequence: 1 },
    { id: "a1", role: "assistant", content: "I will search the codebase.", requestId: "request-1", agentRunId: "run-1", sequence: 2 },
    { id: "u2", role: "user", content: "Open the source file.", requestId: "request-2", agentRunId: "run-2", sequence: 10 },
    { id: "a2", role: "assistant", content: "I will read the file.", requestId: "request-2", agentRunId: "run-2", sequence: 11 },
  ];
  const events = [
    event({
      id: "e-search",
      sequence: 3,
      request_id: "request-1",
      agent_run_id: "run-1",
      tool_call_id: "tool-search",
      payload: { tool_name: "search_codebase", summary: "searched telemetry code" },
    }),
    event({
      id: "e-read",
      sequence: 12,
      request_id: "request-2",
      agent_run_id: "run-2",
      tool_call_id: "tool-read",
      payload: { tool_name: "read_source_file", summary: "read telemetry file" },
    }),
  ];

  const transcript = serializeAiEngineerTranscript(messages, events, "include-tools");
  const [firstAssistant, searchTool, secondUser, secondAssistant, readTool] = indexes(transcript, [
    "I will search the codebase.",
    "### Tool: search_codebase",
    "Open the source file.",
    "I will read the file.",
    "### Tool: read_source_file",
  ]);

  assert.ok(firstAssistant < searchTool);
  assert.ok(searchTool < secondUser);
  assert.ok(secondAssistant < readTool);
  assert.doesNotMatch(transcript, /## Tool Actions/);
});

test("include-tools collapses a permission lifecycle into one tool block", () => {
  const events = [
    event({ id: "e1", event_type: "tool.permission_required", sequence: 1, payload: { tool_name: "deploy_preview_change" } }),
    event({ id: "e2", event_type: "tool.permission_approved", sequence: 2, payload: { tool_name: "deploy_preview_change" } }),
    event({ id: "e3", event_type: "tool.started", sequence: 3, payload: { tool_name: "deploy_preview_change" } }),
    event({
      id: "e4",
      event_type: "tool.completed",
      sequence: 4,
      payload: { tool_name: "deploy_preview_change", summary: "deployed preview change", result: { deployment_id: "preview-1" } },
    }),
  ];

  const transcript = serializeAiEngineerTranscript(
    [{ id: "a1", role: "assistant", content: "I will deploy this.", requestId: "request-1", agentRunId: "run-1" }],
    events,
    "include-tools",
  );

  assert.equal(transcript.match(/### Tool: deploy_preview_change/g)?.length, 1);
  assert.match(transcript, /Permission: approved/);
  assert.match(transcript, /Status: completed/);
});

test("include-tools includes failed tool errors", () => {
  const transcript = serializeAiEngineerTranscript(
    [{ id: "a1", role: "assistant", content: "I will read the file.", requestId: "request-1", agentRunId: "run-1" }],
    [
      event({
        event_type: "tool.failed",
        payload: { tool_name: "read_source_file", error: { message: "file not found" } },
      }),
    ],
    "include-tools",
  );

  assert.match(transcript, /Status: failed/);
  assert.match(transcript, /file not found/);
});

test("include-tools reconstructs streamed assistant chronology", () => {
  const transcript = serializeAiEngineerTranscript(
    [],
    [
      event({ id: "e1", event_type: "message.delta", sequence: 1, tool_call_id: null, payload: { text_delta: "I will search." } }),
      event({ id: "e2", event_type: "tool.completed", sequence: 2, tool_call_id: "tool-search", payload: { tool_name: "search_codebase" } }),
      event({ id: "e3", event_type: "message.delta", sequence: 3, tool_call_id: null, payload: { text_delta: "I found the file." } }),
    ],
    "include-tools",
  );

  const [before, tool, after] = indexes(transcript, ["I will search.", "### Tool: search_codebase", "I found the file."]);
  assert.ok(before < tool);
  assert.ok(tool < after);
});

test("include-tools preserves user messages when reconstructing streamed assistant events", () => {
  const messages: ChatMessage[] = [
    {
      id: "u1",
      role: "user",
      content: "Please inspect telemetry code.",
      requestId: "request-1",
      agentRunId: "run-1",
      createdAt: "2026-05-27T12:00:00Z",
    },
    {
      id: "a1",
      role: "assistant",
      content: "I will search.\n\nI found the file.",
      requestId: "request-1",
      agentRunId: "run-1",
      createdAt: "2026-05-27T12:00:01Z",
    },
  ];
  const events = [
    event({
      id: "e1",
      event_type: "message.delta",
      sequence: 1,
      request_id: "request-1",
      agent_run_id: "run-1",
      tool_call_id: null,
      payload: { text_delta: "I will search." },
      created_at: "2026-05-27T12:00:02Z",
    }),
    event({
      id: "e2",
      event_type: "tool.completed",
      sequence: 2,
      request_id: "request-1",
      agent_run_id: "run-1",
      tool_call_id: "tool-search",
      payload: { tool_name: "search_codebase" },
      created_at: "2026-05-27T12:00:03Z",
    }),
    event({
      id: "e3",
      event_type: "message.delta",
      sequence: 3,
      request_id: "request-1",
      agent_run_id: "run-1",
      tool_call_id: null,
      payload: { text_delta: "I found the file." },
      created_at: "2026-05-27T12:00:04Z",
    }),
  ];

  const transcript = serializeAiEngineerTranscript(messages, events, "include-tools");
  const [user, before, tool, after] = indexes(transcript, [
    "Please inspect telemetry code.",
    "I will search.",
    "### Tool: search_codebase",
    "I found the file.",
  ]);

  assert.ok(user < before);
  assert.ok(before < tool);
  assert.ok(tool < after);
});

test("include-tools treats sequence as run-local across multiple turns", () => {
  const messages: ChatMessage[] = [
    {
      id: "u1",
      role: "user",
      content: "First turn",
      requestId: "request-1",
      agentRunId: "run-1",
      createdAt: "2026-05-27T12:00:00Z",
    },
    {
      id: "a1",
      role: "assistant",
      content: "First answer.",
      requestId: "request-1",
      agentRunId: "run-1",
      createdAt: "2026-05-27T12:00:01Z",
    },
    {
      id: "u2",
      role: "user",
      content: "Second turn",
      requestId: "request-2",
      agentRunId: "run-2",
      createdAt: "2026-05-27T12:01:00Z",
    },
    {
      id: "a2",
      role: "assistant",
      content: "Second answer.",
      requestId: "request-2",
      agentRunId: "run-2",
      createdAt: "2026-05-27T12:01:01Z",
    },
  ];
  const events = [
    event({
      id: "run-1-late-tool",
      sequence: 20,
      request_id: "request-1",
      agent_run_id: "run-1",
      tool_call_id: "tool-first",
      payload: { tool_name: "first_tool" },
      created_at: "2026-05-27T12:00:05Z",
    }),
    event({
      id: "run-2-early-tool",
      sequence: 1,
      request_id: "request-2",
      agent_run_id: "run-2",
      tool_call_id: "tool-second",
      payload: { tool_name: "second_tool" },
      created_at: "2026-05-27T12:01:05Z",
    }),
  ];

  const transcript = serializeAiEngineerTranscript(messages, events, "include-tools");
  const [firstUser, firstTool, secondUser, secondTool] = indexes(transcript, [
    "First turn",
    "### Tool: first_tool",
    "Second turn",
    "### Tool: second_tool",
  ]);

  assert.ok(firstUser < firstTool);
  assert.ok(firstTool < secondUser);
  assert.ok(secondUser < secondTool);
});

test("include-tools does not duplicate assistant content when persisted content and deltas both exist", () => {
  const transcript = serializeAiEngineerTranscript(
    [
      { id: "u1", role: "user", content: "Search please.", requestId: "request-1", agentRunId: "run-1" },
      { id: "a1", role: "assistant", content: "I will search.", requestId: "request-1", agentRunId: "run-1" },
    ],
    [
      event({
        id: "e1",
        event_type: "message.delta",
        sequence: 1,
        tool_call_id: null,
        payload: { text_delta: "I will search." },
      }),
    ],
    "include-tools",
  );

  assert.equal(transcript.match(/I will search\./g)?.length, 1);
});

test("include-tools keeps unmatched tool actions sorted by timestamp across runs", () => {
  const transcript = serializeAiEngineerTranscript(
    [{ id: "u1", role: "user", content: "No assistant metadata.", requestId: "request-0", agentRunId: "run-0" }],
    [
      event({
        id: "run-2-early-sequence",
        sequence: 1,
        request_id: "request-2",
        agent_run_id: "run-2",
        tool_call_id: "tool-second",
        payload: { tool_name: "second_tool" },
        created_at: "2026-05-27T12:01:05Z",
      }),
      event({
        id: "run-1-late-sequence",
        sequence: 20,
        request_id: "request-1",
        agent_run_id: "run-1",
        tool_call_id: "tool-first",
        payload: { tool_name: "first_tool" },
        created_at: "2026-05-27T12:00:05Z",
      }),
    ],
    "include-tools",
  );

  const [unmatched, firstTool, secondTool] = indexes(transcript, [
    "## Unmatched Tool Actions",
    "### Tool: first_tool",
    "### Tool: second_tool",
  ]);
  assert.ok(unmatched < firstTool);
  assert.ok(firstTool < secondTool);
});

test("include-tools redacts secret-ish keys in input and output", () => {
  const transcript = serializeAiEngineerTranscript(
    [{ id: "a1", role: "assistant", content: "I will call the tool.", requestId: "request-1", agentRunId: "run-1" }],
    [
      event({
        payload: {
          tool_name: "deploy_preview_change",
          input: {
            api_key: "sk-real-secret",
            authorization: "Bearer hidden",
            password: "hunter2",
            change_id: "change-1",
          },
        },
      }),
    ],
    "include-tools",
  );

  assert.doesNotMatch(transcript, /sk-real-secret|Bearer hidden|hunter2/);
  assert.match(transcript, /\[redacted\]/);
  assert.match(transcript, /change-1/);
});

test("debug-trace includes raw chronological event metadata and redacted payload JSON", () => {
  const transcript = serializeAiEngineerTranscript(
    [{ id: "u1", role: "user", content: "Inspect telemetry code.", requestId: "request-1", agentRunId: "run-1", sequence: 1 }],
    [
      event({
        id: "e1",
        event_type: "tool.completed",
        sequence: 2,
        request_id: "request-1",
        agent_run_id: "run-1",
        tool_call_id: "tool-search",
        emitted_by: "agent-runtime-service",
        payload: {
          assistant_message_id: "assistant-1",
          tool_name: "search_codebase",
          input: { query: "telemetry", api_key: "secret-key" },
        },
      }),
    ],
    "debug-trace",
  );

  assert.match(transcript, /# AI Engineer Debug Trace/);
  assert.match(transcript, /## Event: tool\.completed/);
  assert.match(transcript, /Sequence: 2/);
  assert.match(transcript, /Request id: request-1/);
  assert.match(transcript, /Agent run id: run-1/);
  assert.match(transcript, /Tool call id: tool-search/);
  assert.match(transcript, /Assistant message id: assistant-1/);
  assert.match(transcript, /Emitted by: agent-runtime-service/);
  assert.match(transcript, /"api_key": "\[redacted\]"/);
  assert.doesNotMatch(transcript, /secret-key/);
});

test("debug-trace orders events across runs by conversation time, not raw sequence", () => {
  const transcript = serializeAiEngineerTranscript(
    [
      {
        id: "u1",
        role: "user",
        content: "First turn",
        requestId: "request-1",
        agentRunId: "run-1",
        createdAt: "2026-05-27T12:00:00Z",
      },
      {
        id: "u2",
        role: "user",
        content: "Second turn",
        requestId: "request-2",
        agentRunId: "run-2",
        createdAt: "2026-05-27T12:01:00Z",
      },
    ],
    [
      event({
        id: "run-1-late",
        event_type: "tool.completed",
        sequence: 20,
        request_id: "request-1",
        agent_run_id: "run-1",
        tool_call_id: "tool-first",
        payload: { tool_name: "first_tool" },
        created_at: "2026-05-27T12:00:05Z",
      }),
      event({
        id: "run-2-early",
        event_type: "tool.completed",
        sequence: 1,
        request_id: "request-2",
        agent_run_id: "run-2",
        tool_call_id: "tool-second",
        payload: { tool_name: "second_tool" },
        created_at: "2026-05-27T12:01:05Z",
      }),
    ],
    "debug-trace",
  );

  const [firstEvent, secondEvent] = indexes(transcript, [
    "Tool call id: tool-first",
    "Tool call id: tool-second",
  ]);

  assert.ok(firstEvent < secondEvent);
});

test("debug-trace does not collapse tool lifecycle events", () => {
  const transcript = serializeAiEngineerTranscript(
    [],
    [
      event({ id: "e1", event_type: "tool.permission_required", sequence: 1 }),
      event({ id: "e2", event_type: "tool.permission_approved", sequence: 2 }),
      event({ id: "e3", event_type: "tool.started", sequence: 3 }),
      event({ id: "e4", event_type: "tool.completed", sequence: 4 }),
    ],
    "debug-trace",
  );

  assert.equal(transcript.match(/## Event:/g)?.length, 4);
  assert.match(transcript, /## Event: tool\.permission_required/);
  assert.match(transcript, /## Event: tool\.permission_approved/);
  assert.match(transcript, /## Event: tool\.started/);
  assert.match(transcript, /## Event: tool\.completed/);
});
