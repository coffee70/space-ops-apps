import assert from "node:assert/strict";
import test from "node:test";

import { serializeAiEngineerTranscript } from "./transcript";
import type { ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";

test("serializeAiEngineerTranscript copies chat messages without tool details by default", () => {
  const messages: ChatMessage[] = [
    { id: "m1", role: "user", content: "Check the code index" },
    { id: "m2", role: "assistant", content: "The index is ready." },
  ];
  const events: ChatEvent[] = [
    {
      id: "e1",
      event_type: "tool.completed",
      conversation_id: "c1",
      agent_run_id: "r1",
      request_id: "q1",
      tool_call_id: "t1",
      sequence: 1,
      emitted_by: "agent-runtime-service",
      payload: { tool_name: "search_codebase", summary: "searched code" },
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const transcript = serializeAiEngineerTranscript(messages, events, "messages-only");

  assert.match(transcript, /## User/);
  assert.match(transcript, /## Assistant/);
  assert.doesNotMatch(transcript, /Tool Actions/);
});

test("serializeAiEngineerTranscript includes readable tool summaries when requested", () => {
  const transcript = serializeAiEngineerTranscript(
    [{ id: "m1", role: "assistant", content: "Done." }],
    [
      {
        id: "e1",
        event_type: "tool.completed",
        conversation_id: "c1",
        agent_run_id: "r1",
        request_id: "q1",
        tool_call_id: "t1",
        sequence: 1,
        emitted_by: "agent-runtime-service",
        payload: { tool_name: "search_codebase", summary: "searched for telemetry implementation" },
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    "include-tools",
  );

  assert.match(transcript, /### Tool: search_codebase/);
  assert.match(transcript, /Summary: searched for telemetry implementation/);
});
