import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";
import { AiEngineerOperationStatusPill } from "./ai-engineer-operation-status-pill";

function runtime(effective_state: FrontendRuntimeStatus["effective_state"]): FrontendRuntimeStatus {
  return {
    frontend_unit_id: "mission-control-frontend-shell",
    target_application_id: null,
    baseline_branch: "main",
    baseline_commit_sha: null,
    active: null,
    pending: null,
    last_terminal: null,
    effective_state,
  };
}

test("AiEngineerOperationStatusPill renders the running spinner inside the status pill", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerOperationStatusPill runtimeStatus={runtime("preview_deploying")} />,
  );

  assert.match(markup, /data-testid="ai-engineer-operation-status-pill"/);
  assert.match(markup, /data-testid="ai-engineer-status-pill-left-icon"/);
  assert.match(markup, /data-testid="ai-engineer-operation-status-spinner"/);
  assert.match(
    markup,
    /data-testid="ai-engineer-operation-status-pill"[\s\S]*data-testid="ai-engineer-status-pill-left-icon"[\s\S]*data-testid="ai-engineer-operation-status-spinner"[\s\S]*Deploying/,
  );
});

test("AiEngineerOperationStatusPill renders success as only the rounded status pill", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerOperationStatusPill runtimeStatus={runtime("preview_active")} />,
  );

  assert.match(markup, /data-testid="ai-engineer-operation-status-pill"/);
  assert.match(markup, /Preview active/);
  assert.doesNotMatch(markup, /ai-engineer-operation-status-check/);
});

test("AiEngineerOperationStatusPill follows repeated runtime status workflow", () => {
  const sequence: Array<[FrontendRuntimeStatus["effective_state"], string]> = [
    ["baseline_active", "Baseline active"],
    ["preview_deploying", "Deploying"],
    ["preview_active", "Preview active"],
    ["baseline_reverting", "Reverting preview..."],
    ["baseline_active", "Baseline active"],
    ["preview_deploying", "Deploying"],
    ["preview_active", "Preview active"],
    ["baseline_reverting", "Reverting preview..."],
    ["baseline_active", "Baseline active"],
  ];

  const labels = sequence.map(([state, expected]) => {
    const markup = renderToStaticMarkup(<AiEngineerOperationStatusPill runtimeStatus={runtime(state)} />);
    assert.match(markup, new RegExp(expected.replaceAll(".", "\\.")));
    return expected;
  });

  assert.deepEqual(labels, [
    "Baseline active",
    "Deploying",
    "Preview active",
    "Reverting preview...",
    "Baseline active",
    "Deploying",
    "Preview active",
    "Reverting preview...",
    "Baseline active",
  ]);
});
