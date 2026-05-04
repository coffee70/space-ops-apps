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
});

test("AiEngineerMessage renders streaming assistant content instead of thinking state", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerMessage message={{ id: "m1", role: "assistant", content: "Runtime response", status: "streaming" }} />,
  );

  assert.match(markup, /Runtime response/);
  assert.doesNotMatch(markup, /Thinking\.\.\./);
});
