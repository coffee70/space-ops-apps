import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerOperationStatusPill } from "./ai-engineer-operation-status-pill";

test("AiEngineerOperationStatusPill renders the running spinner inside the status pill", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerOperationStatusPill
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
          payload: {},
          created_at: "2026-05-21T00:00:00.000Z",
        },
      ]}
    />,
  );

  assert.match(markup, /data-testid="ai-engineer-operation-status-pill"/);
  assert.match(markup, /data-testid="ai-engineer-status-pill-left-icon"/);
  assert.match(markup, /data-testid="ai-engineer-operation-status-spinner"/);
  assert.match(
    markup,
    /data-testid="ai-engineer-operation-status-pill"[\s\S]*data-testid="ai-engineer-status-pill-left-icon"[\s\S]*data-testid="ai-engineer-operation-status-spinner"[\s\S]*Deploying/,
  );
});
