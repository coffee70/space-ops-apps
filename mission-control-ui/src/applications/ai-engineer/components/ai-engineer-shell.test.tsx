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

test("AiEngineerShell renders operation status pill for deployment progress", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerShell
      title="AI Engineer"
      messages={[]}
      events={[
        {
          id: "event-1",
          event_type: "deployment.submitted",
          conversation_id: "conversation-1",
          agent_run_id: "run-1",
          request_id: "request-1",
          tool_call_id: null,
          sequence: 1,
          emitted_by: "tool-execution-service",
          payload: { deployment_id: "dep_1", branch: "preview/cyan", unit_id: "mission-control-frontend-shell", status: "building" },
          created_at: "2026-05-21T00:00:00.000Z",
        },
      ]}
      attachments={[]}
      executionMode="execute"
      onExecutionModeChange={() => {}}
      onSend={async () => {}}
    />,
  );

  assert.match(markup, /data-testid="ai-engineer-operation-status-pill"/);
  assert.match(markup, /Deploying preview/);
  assert.doesNotMatch(markup, /dep_1/);
});
