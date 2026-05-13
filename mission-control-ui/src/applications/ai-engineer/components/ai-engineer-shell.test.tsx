import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerShell } from "./ai-engineer-shell";

test("AiEngineerShell uses theme-backed sidebar surfaces", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerShell
      title="AI Engineer"
      messages={[]}
      events={[]}
      attachments={[]}
      executionMode="read_only"
      onExecutionModeChange={() => {}}
      onSend={async () => {}}
    />,
  );

  assert.match(markup, /data-testid="ai-engineer-shell"/);
  assert.match(markup, /bg-background/);
  assert.doesNotMatch(markup, /bg-sidebar/);
  assert.doesNotMatch(markup, /bg-card\/60/);
  assert.doesNotMatch(markup, /border-border\/40 bg-card\/60/);
});
