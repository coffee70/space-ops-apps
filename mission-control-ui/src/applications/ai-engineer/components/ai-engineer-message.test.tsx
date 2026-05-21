import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerMessage } from "./ai-engineer-message";

test("AiEngineerMessage renders thinking state for empty streaming assistant messages", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "assistant", content: "", status: "streaming" }} />,
  );

  assert.match(markup, /data-testid="ai-engineer-message-assistant"/);
  assert.match(markup, /data-testid="ai-engineer-assistant-message"/);
  assert.match(markup, /Thinking\.\.\./);
  assert.match(markup, /shimmer-text/);
});

test("AiEngineerMessage renders streaming assistant content instead of thinking state", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "assistant", content: "Runtime response", status: "streaming" }} />,
  );

  assert.match(markup, /Runtime response/);
  assert.match(markup, /ai-engineer-streaming-assistant/);
  assert.doesNotMatch(markup, /Thinking\.\.\./);
});

test("AiEngineerMessage does not render generic tool-role result cards", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "tool", content: "Tool output", status: "complete" }} />,
  );

  assert.equal(markup, "");
  assert.doesNotMatch(markup, /Tool result/);
  assert.doesNotMatch(markup, /Tool output/);
  assert.doesNotMatch(markup, /data-role="tool"/);
});

test("AiEngineerMessage still renders tool permission cards", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage
      message={{
        id: "m1",
        role: "assistant",
        content: "",
        status: "complete",
        part: {
          kind: "tool-permission",
          permissionRequestId: "permission-1",
          toolCallId: "44444444-4444-4444-4444-444444444444",
          toolName: "deploy_preview_change",
          approvalToken: "approval-token",
          prompt: {
            title: "Deploy preview changes?",
            description: "The AI Engineer wants to deploy mission-control-frontend-shell.",
            primary_action: "Deploy changes",
            secondary_action: "Cancel",
            details: {
              target_unit_id: "mission-control-frontend-shell",
            },
          },
        },
      }}
      events={[]}
    />,
  );

  assert.match(markup, /data-testid="ai-engineer-tool-permission-message"/);
  assert.match(markup, /data-testid="tool-permission-card"/);
  assert.match(markup, /Deploy preview changes\?/);
  assert.match(markup, /mission-control-frontend-shell/);
});
