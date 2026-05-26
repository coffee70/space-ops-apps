import assert from "node:assert/strict";
import test from "node:test";

import { getAiEngineerOperationStatusFromRuntime } from "./operation-status";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

function runtime(effective_state: FrontendRuntimeStatus["effective_state"]): FrontendRuntimeStatus {
  return {
    frontend_unit_id: "mission-control-frontend-shell",
    target_application_id: "ai-engineer",
    baseline_branch: "main",
    baseline_commit_sha: "base123",
    active: null,
    pending: null,
    last_terminal: null,
    effective_state,
  };
}

test("operation status maps preview deploy progress from runtime status", () => {
  assert.deepEqual(getAiEngineerOperationStatusFromRuntime(runtime("preview_deploying")), {
    status: "running",
    label: "Deploying",
  });
});

test("operation status maps preview active from runtime status", () => {
  assert.deepEqual(getAiEngineerOperationStatusFromRuntime(runtime("preview_active")), {
    status: "success",
    label: "Preview active",
  });
});

test("operation status maps baseline reverting from runtime status", () => {
  assert.deepEqual(getAiEngineerOperationStatusFromRuntime(runtime("baseline_reverting")), {
    status: "running",
    label: "Reverting preview...",
  });
});

test("operation status maps baseline active from runtime status", () => {
  assert.deepEqual(getAiEngineerOperationStatusFromRuntime(runtime("baseline_active")), {
    status: "success",
    label: "Baseline active",
  });
});

test("operation status maps failures from runtime status", () => {
  assert.deepEqual(getAiEngineerOperationStatusFromRuntime(runtime("preview_deploy_failed")), {
    status: "failed",
    label: "Preview deploy failed",
  });
  assert.deepEqual(getAiEngineerOperationStatusFromRuntime(runtime("baseline_revert_failed")), {
    status: "failed",
    label: "Revert failed",
  });
});

test("operation status hides unknown runtime status", () => {
  assert.equal(getAiEngineerOperationStatusFromRuntime(runtime("unknown")), null);
});
