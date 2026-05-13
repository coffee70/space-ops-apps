import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerConversationSidebar } from "./ai-engineer-conversation-sidebar";
import type { AiEngineerConversationSummary } from "@/applications/ai-engineer/types";

function buildConversation(input: Partial<AiEngineerConversationSummary> & { id: string }): AiEngineerConversationSummary {
  return {
    id: input.id,
    title: input.title ?? "AI Engineer Session",
    mission_id: input.mission_id ?? null,
    vehicle_id: input.vehicle_id ?? null,
    execution_mode: input.execution_mode ?? "read_only",
    created_at: input.created_at ?? "2026-05-12T12:00:00.000Z",
    updated_at: input.updated_at ?? "2026-05-12T12:00:00.000Z",
  };
}

test("AiEngineerConversationSidebar renders recent conversations and highlights the active row", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerConversationSidebar
      conversations={[
        buildConversation({ id: "conversation-1", title: "DrogonSat UI" }),
        buildConversation({ id: "conversation-2", title: "Docs Retrieval" }),
      ]}
      activeConversationId="conversation-2"
      isLoading={false}
      error={null}
      onNewChat={() => {}}
      onSelectConversation={() => {}}
    />,
  );

  assert.match(markup, /data-testid="ai-engineer-conversation-sidebar"/);
  assert.match(markup, /New Chat/);
  assert.match(markup, /DrogonSat UI/);
  assert.match(markup, /Docs Retrieval/);
  assert.match(markup, /data-active="true"/);
  assert.match(markup, /aria-current="page"/);
});

test("AiEngineerConversationSidebar renders empty, loading, error, and disabled states", () => {
  const emptyMarkup = renderToStaticMarkup(
    <AiEngineerConversationSidebar
      conversations={[]}
      activeConversationId={null}
      isLoading={false}
      error={null}
      onNewChat={() => {}}
      onSelectConversation={() => {}}
    />,
  );
  assert.match(emptyMarkup, /No recent chats yet/);

  const loadingMarkup = renderToStaticMarkup(
    <AiEngineerConversationSidebar
      conversations={[]}
      activeConversationId={null}
      isLoading
      error={null}
      onNewChat={() => {}}
      onSelectConversation={() => {}}
    />,
  );
  assert.match(loadingMarkup, /Loading chats/);

  const errorMarkup = renderToStaticMarkup(
    <AiEngineerConversationSidebar
      conversations={[]}
      activeConversationId={null}
      isLoading={false}
      error="Failed to list conversations"
      onNewChat={() => {}}
      onSelectConversation={() => {}}
    />,
  );
  assert.match(errorMarkup, /Failed to list conversations/);

  const disabledMarkup = renderToStaticMarkup(
    <AiEngineerConversationSidebar
      conversations={[buildConversation({ id: "conversation-1" })]}
      activeConversationId={null}
      isLoading={false}
      error={null}
      disabled
      onNewChat={() => {}}
      onSelectConversation={() => {}}
    />,
  );
  assert.match(disabledMarkup, /disabled=""/);
});
