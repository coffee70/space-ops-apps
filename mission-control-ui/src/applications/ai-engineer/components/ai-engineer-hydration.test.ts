import assert from "node:assert/strict";
import test from "node:test";

import {
  attachLivePermissionPart,
  mapConversationMessagesToChatMessagesWithEvents,
} from "./ai-engineer-app";
import type { AiEngineerConversationMessage, ChatEvent, ChatMessage } from "../types";

function permissionEvent(permissionRequestId: string): ChatEvent {
  return {
    id: `event-${permissionRequestId}`,
    event_type: "tool.permission_required",
    conversation_id: "conversation-1",
    agent_run_id: "run-1",
    request_id: "request-1",
    tool_call_id: `tool-${permissionRequestId}`,
    sequence: 1,
    emitted_by: "tool-execution-service",
    created_at: "2026-05-26T12:00:00.000Z",
    payload: {
      permission_request_id: permissionRequestId,
      tool_call_id: `tool-${permissionRequestId}`,
      tool_name: "deploy_preview_change",
      prompt: { title: "Deploy preview" },
    },
  };
}

test("persisted hydration uses structured message permission requests", () => {
  const messages: AiEngineerConversationMessage[] = [
    {
      id: "assistant-1",
      conversation_id: "conversation-1",
      role: "assistant",
      content: "First",
      request_id: "request-1",
      tool_permission_requests: [
        {
          permission_request_id: "permission-1",
          tool_call_id: "tool-1",
          tool_name: "deploy_preview_change",
          status: "pending",
          prompt: { title: "Deploy preview" },
        },
      ],
    },
  ];

  const hydrated = mapConversationMessagesToChatMessagesWithEvents(messages, []);
  assert.equal(hydrated.length, 1);
  assert.equal(hydrated[0]?.id, "assistant-1");
  assert.equal(hydrated[0]?.parts?.[0]?.permissionRequestId, "permission-1");
});

test("persisted hydration does not create assistant placeholders from raw permission events", () => {
  const hydrated = mapConversationMessagesToChatMessagesWithEvents([], [permissionEvent("permission-orphan")]);
  assert.deepEqual(hydrated, []);
});

test("multiple assistant messages keep permission cards under their parent messages", () => {
  const messages: AiEngineerConversationMessage[] = [
    {
      id: "assistant-1",
      conversation_id: "conversation-1",
      role: "assistant",
      content: "First",
      request_id: "request-1",
      tool_permission_requests: [
        {
          permission_request_id: "permission-1",
          tool_call_id: "tool-1",
          tool_name: "deploy_preview_change",
          status: "pending",
          prompt: { title: "Deploy first" },
        },
      ],
    },
    {
      id: "assistant-2",
      conversation_id: "conversation-1",
      role: "assistant",
      content: "Second",
      request_id: "request-2",
      tool_permission_requests: [
        {
          permission_request_id: "permission-2",
          tool_call_id: "tool-2",
          tool_name: "delete_managed_resources",
          status: "pending",
          prompt: { title: "Delete resources" },
        },
      ],
    },
  ];

  const hydrated = mapConversationMessagesToChatMessagesWithEvents(messages, []);
  assert.equal(hydrated[0]?.parts?.[0]?.permissionRequestId, "permission-1");
  assert.equal(hydrated[1]?.parts?.[0]?.permissionRequestId, "permission-2");
});

test("live permission attachment only targets the current streaming assistant", () => {
  const messages: ChatMessage[] = [];
  assert.deepEqual(attachLivePermissionPart(messages, permissionEvent("permission-live"), "draft"), []);

  const attached = attachLivePermissionPart(
    [{ id: "draft", role: "assistant", content: "", status: "streaming" }],
    permissionEvent("permission-live"),
    "draft",
  );
  assert.equal(attached[0]?.parts?.[0]?.permissionRequestId, "permission-live");
});
