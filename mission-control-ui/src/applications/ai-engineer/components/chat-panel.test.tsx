import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ChatPanel } from "./chat-panel";

test("ChatPanel renders role-specific AI Engineer messages", () => {
  const markup = renderToStaticMarkup(
    <ChatPanel
      messages={[
        { id: "m1", role: "user", content: "User question", status: "complete" },
        { id: "m2", role: "assistant", content: "Assistant response", status: "complete" },
        { id: "m3", role: "tool", content: "Tool output", status: "complete" },
      ]}
      attachments={[]}
      executionMode="read_only"
      onExecutionModeChange={() => {}}
      onSend={async () => {}}
    />,
  );

  assert.match(markup, /User question/);
  assert.match(markup, /Assistant response/);
  assert.doesNotMatch(markup, /Tool output/);
  assert.doesNotMatch(markup, /Tool result/);
  assert.doesNotMatch(markup, /data-role="tool"/);
  assert.match(markup, /data-testid="ai-engineer-message-user"/);
  assert.match(markup, /data-testid="ai-engineer-message-assistant"/);
  assert.doesNotMatch(markup, />USER</);
  assert.doesNotMatch(markup, />ASSISTANT</);
});

test("ChatPanel renders greeting and Vercel-style composer controls", () => {
  const markup = renderToStaticMarkup(
    <ChatPanel
      messages={[]}
      attachments={[]}
      executionMode="read_only"
      onExecutionModeChange={() => {}}
      onSend={async () => {}}
    />,
  );

  assert.match(markup, /What should we inspect or build/);
  assert.match(markup, /data-testid="ai-engineer-composer"/);
  assert.match(markup, /data-testid="ai-engineer-chat-input"/);
  assert.doesNotMatch(markup, /aria-label="Attach mission or vehicle documents"/);
  assert.doesNotMatch(markup, /type="file"/);
  assert.match(markup, /aria-label="Send message"/);
  assert.match(markup, /Read/);
  assert.match(markup, /Suggest/);
  assert.match(markup, /Execute/);
  assert.match(markup, /Governed execute/);
  assert.doesNotMatch(markup, /<select/);
});
