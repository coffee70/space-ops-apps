import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import type { AiEngineerConversationDetail, AiEngineerConversationSummary } from "@/applications/ai-engineer/types";
import { applyAiEngineerGeneratedConversationTitle } from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";

function summary(): AiEngineerConversationSummary {
  return {
    id: "conversation-1",
    title: null,
    mission_id: null,
    vehicle_id: null,
    execution_mode: "read_only",
    selected_model_id: null,
    title_source: "initial",
    title_model_id: null,
    created_at: "2026-05-16T00:00:00Z",
    updated_at: "2026-05-16T00:00:00Z",
  };
}

test("generated title stream event updates conversation list and detail cache", () => {
  const queryClient = new QueryClient();
  const conversation = summary();
  queryClient.setQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations, [conversation]);
  queryClient.setQueryData<AiEngineerConversationDetail>(queryKeys.aiEngineerConversation(conversation.id), {
    ...conversation,
    messages: [],
    events: [],
  });

  applyAiEngineerGeneratedConversationTitle(queryClient, {
    conversationId: conversation.id,
    title: "Thermal Drift Review",
    titleModelId: "title-model",
    updatedAt: "2026-05-16T00:01:00Z",
  });

  const list = queryClient.getQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations);
  const detail = queryClient.getQueryData<AiEngineerConversationDetail>(queryKeys.aiEngineerConversation(conversation.id));
  assert.equal(list?.[0]?.title, "Thermal Drift Review");
  assert.equal(list?.[0]?.title_source, "generated");
  assert.equal(list?.[0]?.title_model_id, "title-model");
  assert.equal(detail?.title, "Thermal Drift Review");
  assert.equal(detail?.title_source, "generated");
});

test("generated title stream event does not overwrite manual cache state", () => {
  const queryClient = new QueryClient();
  const conversation = {
    id: "conversation-1",
    title: "Manual Name",
    mission_id: null,
    vehicle_id: null,
    execution_mode: "read_only",
    selected_model_id: null,
    title_source: "manual",
    title_model_id: null,
    created_at: "2026-05-16T00:00:00Z",
    updated_at: "2026-05-16T00:00:00Z",
  } satisfies AiEngineerConversationSummary;

  queryClient.setQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations, [conversation]);
  queryClient.setQueryData<AiEngineerConversationDetail>(queryKeys.aiEngineerConversation(conversation.id), {
    ...conversation,
    messages: [],
    events: [],
  });

  applyAiEngineerGeneratedConversationTitle(queryClient, {
    conversationId: conversation.id,
    title: "Generated Name",
    titleModelId: "title-model",
    updatedAt: "2026-05-16T00:01:00Z",
  });

  const list = queryClient.getQueryData<AiEngineerConversationSummary[]>(queryKeys.aiEngineerConversations);
  const detail = queryClient.getQueryData<AiEngineerConversationDetail>(queryKeys.aiEngineerConversation(conversation.id));

  assert.equal(list?.[0]?.title, "Manual Name");
  assert.equal(list?.[0]?.title_source, "manual");
  assert.equal(list?.[0]?.title_model_id, null);
  assert.equal(detail?.title, "Manual Name");
  assert.equal(detail?.title_source, "manual");
  assert.equal(detail?.title_model_id, null);
});
