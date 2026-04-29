import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ChatPanel } from "./chat-panel";

test("ChatPanel renders user, assistant, and tool messages", () => {
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
  assert.match(markup, /Tool output/);
});

test("ChatPanel exposes execution mode selector and default read_only value", () => {
  const markup = renderToStaticMarkup(
    <ChatPanel
      messages={[]}
      attachments={[]}
      executionMode="read_only"
      onExecutionModeChange={() => {}}
      onSend={async () => {}}
    />,
  );

  assert.match(markup, /id="execution-mode"/);
  assert.match(markup, /Read-only/);
  assert.match(markup, /Suggest/);
  assert.match(markup, /Execute/);
  assert.match(markup, /option value="read_only" selected=""/);
});
