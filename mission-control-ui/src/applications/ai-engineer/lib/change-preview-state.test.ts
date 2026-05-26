import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDeploySubmitted,
  applyDeployUpdate,
  applyRevertSubmitted,
  applyRevertUpdate,
  changeSummaryFromEvent,
  createInitialChangePreviewState,
  failPreview,
  isChangeSummaryEvent,
  isTerminalChangePreviewStatus,
  startDeploying,
  startReverting,
} from "./change-preview-state";
import { deploymentLifecycleEventType } from "./use-change-preview-flow";
import type { AiEngineerChangeSummary, DeploymentRecord } from "./change-preview-types";
import type { ChatEvent } from "../types";

function buildEvent(overrides: Partial<ChatEvent> = {}): ChatEvent {
  return {
    id: overrides.id ?? "evt-1",
    event_type: overrides.event_type ?? "change.summary",
    conversation_id: overrides.conversation_id ?? "conversation-1",
    agent_run_id: overrides.agent_run_id ?? "run-1",
    request_id: overrides.request_id ?? "request-1",
    tool_call_id: overrides.tool_call_id ?? null,
    sequence: overrides.sequence ?? 1,
    emitted_by: overrides.emitted_by ?? "agent-runtime-service",
    payload: overrides.payload ?? {
      branch: "preview/example",
      base_branch: "main",
      changed_files: ["src/foo.ts", "src/bar.ts"],
      target_unit_id: "telemetry-app",
      affected_capability: "telemetry-detail",
      risk_level: "low",
      validation_status: "not_run",
    },
    created_at: overrides.created_at ?? new Date("2026-05-01T00:00:00Z").toISOString(),
  };
}

function buildDeployment(overrides: Partial<DeploymentRecord> = {}): DeploymentRecord {
  return {
    deployment_id: overrides.deployment_id ?? "dep_1",
    unit_id: overrides.unit_id ?? "telemetry-app",
    branch: overrides.branch ?? "preview/example",
    commit_sha: overrides.commit_sha ?? "abc123",
    status: overrides.status ?? "pending",
    health_status: overrides.health_status ?? "unknown",
    logs_url: overrides.logs_url,
    registered: overrides.registered,
    failure_reason: overrides.failure_reason ?? null,
  };
}

test("isChangeSummaryEvent matches change.summary events only", () => {
  assert.equal(isChangeSummaryEvent(buildEvent()), true);
  assert.equal(isChangeSummaryEvent(buildEvent({ event_type: "tool.started" })), false);
});

test("changeSummaryFromEvent maps payload to typed change summary with defaults", () => {
  const summary = changeSummaryFromEvent(
    buildEvent({
      payload: {
        branch: "preview/typed",
        target_application_id: "telemetry",
        changed_files: ["a.ts"],
        affected_capability: "telemetry-detail",
      },
    }),
  );
  assert.ok(summary);
  assert.equal(summary?.branch, "preview/typed");
  assert.equal(summary?.baseBranch, "main");
  assert.equal(summary?.targetApplicationId, "telemetry");
  assert.equal(summary?.targetUnitId, null);
  assert.deepEqual(summary?.changedFiles, ["a.ts"]);
  assert.equal(summary?.riskLevel, "low");
  assert.equal(summary?.validationStatus, "not_run");
});

test("changeSummaryFromEvent returns null when branch missing", () => {
  const summary = changeSummaryFromEvent(buildEvent({ payload: { affected_capability: "x" } }));
  assert.equal(summary, null);
});

test("deploy success path transitions through deploying to deployed_preview", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  assert.equal(state.status, "ready_to_deploy");

  state = startDeploying(state);
  assert.equal(state.status, "deploying");

  state = applyDeploySubmitted(state, buildDeployment({ status: "pending" }));
  assert.equal(state.status, "deploying");
  assert.equal(state.previewDeploymentId, "dep_1");

  state = applyDeployUpdate(state, buildDeployment({ status: "building" }));
  assert.equal(state.status, "deploying");

  state = applyDeployUpdate(state, buildDeployment({ status: "healthy", health_status: "passing" }));
  assert.equal(state.status, "deployed_preview");
  assert.equal(state.previewDeployment?.status, "healthy");
});

test("deploy failure path transitions to failed and surfaces reason", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  state = startDeploying(state);
  state = applyDeploySubmitted(state, buildDeployment({ status: "pending" }));
  state = applyDeployUpdate(
    state,
    buildDeployment({ status: "failed", failure_reason: "compile error" }),
  );
  assert.equal(state.status, "failed");
  assert.equal(state.failureReason, "compile error");
});

test("revert success path transitions through reverting to baseline_restored", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  state = applyDeployUpdate(
    state,
    buildDeployment({ status: "healthy", health_status: "passing", deployment_id: "dep_preview" }),
  );
  state.previewDeploymentId = "dep_preview";

  state = startReverting(state);
  assert.equal(state.status, "reverting");

  state = applyRevertSubmitted(state, buildDeployment({ deployment_id: "dep_revert", status: "pending" }));
  assert.equal(state.status, "reverting");

  state = applyRevertUpdate(state, buildDeployment({ deployment_id: "dep_revert", status: "healthy", health_status: "passing" }));
  assert.equal(state.status, "baseline_restored");
});

test("revert failure path transitions to failed and surfaces reason", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  state = startReverting(state);
  state = applyRevertSubmitted(state, buildDeployment({ deployment_id: "dep_revert", status: "pending" }));
  state = applyRevertUpdate(
    state,
    buildDeployment({ deployment_id: "dep_revert", status: "failed", failure_reason: "rollback timeout" }),
  );
  assert.equal(state.status, "failed");
  assert.equal(state.failureReason, "rollback timeout");
});

test("failPreview transitions any state to failed with reason", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  const state = failPreview(createInitialChangePreviewState(summary), "user aborted");
  assert.equal(state.status, "failed");
  assert.equal(state.failureReason, "user aborted");
});

test("deploy replaced before becoming healthy transitions to failed with friendly reason", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  state = startDeploying(state);
  state = applyDeploySubmitted(state, buildDeployment({ status: "pending" }));
  state = applyDeployUpdate(state, buildDeployment({ status: "replaced" }));
  assert.equal(state.status, "failed");
  assert.equal(state.failureReason, "Preview deployment was replaced before it became active.");
  assert.equal(state.previewDeployment?.status, "replaced");
});

test("deploy replaced uses backend failure_reason when present", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  state = startDeploying(state);
  state = applyDeploySubmitted(state, buildDeployment({ status: "pending" }));
  state = applyDeployUpdate(
    state,
    buildDeployment({ status: "replaced", failure_reason: "Superseded by dep_xyz" }),
  );
  assert.equal(state.status, "failed");
  assert.equal(state.failureReason, "Superseded by dep_xyz");
});

test("revert replaced before becoming healthy transitions to failed", () => {
  const summary = changeSummaryFromEvent(buildEvent()) as AiEngineerChangeSummary;
  let state = createInitialChangePreviewState(summary);
  state = startReverting(state);
  state = applyRevertSubmitted(state, buildDeployment({ deployment_id: "dep_revert", status: "pending" }));
  state = applyRevertUpdate(state, buildDeployment({ deployment_id: "dep_revert", status: "replaced" }));
  assert.equal(state.status, "failed");
  assert.equal(state.failureReason, "Baseline deployment was replaced before it became active.");
});

test("isTerminalChangePreviewStatus marks deployed/restored/failed as terminal", () => {
  assert.equal(isTerminalChangePreviewStatus("deployed_preview"), true);
  assert.equal(isTerminalChangePreviewStatus("baseline_restored"), true);
  assert.equal(isTerminalChangePreviewStatus("failed"), true);
  assert.equal(isTerminalChangePreviewStatus("deploying"), false);
  assert.equal(isTerminalChangePreviewStatus("idle"), false);
});

test("deploymentLifecycleEventType maps in-progress kernel statuses to invalidating timeline events", () => {
  for (const status of ["queued", "pending", "materializing"]) {
    assert.equal(deploymentLifecycleEventType(buildDeployment({ status }), "deploy"), "deployment.submitted");
    assert.equal(deploymentLifecycleEventType(buildDeployment({ status }), "revert"), "baseline.deployment_submitted");
  }

  for (const status of ["building", "health_checking"]) {
    assert.equal(deploymentLifecycleEventType(buildDeployment({ status }), "deploy"), "deployment.build_started");
    assert.equal(deploymentLifecycleEventType(buildDeployment({ status }), "revert"), "baseline.build_started");
  }

  assert.equal(deploymentLifecycleEventType(buildDeployment({ status: "healthy" }), "deploy"), "preview.active");
  assert.equal(deploymentLifecycleEventType(buildDeployment({ status: "healthy" }), "revert"), "baseline.active");
  assert.equal(deploymentLifecycleEventType(buildDeployment({ status: "failed" }), "deploy"), "deployment.failed");
  assert.equal(deploymentLifecycleEventType(buildDeployment({ status: "failed" }), "revert"), "revert.failed");
  assert.equal(deploymentLifecycleEventType(buildDeployment({ status: "replaced" }), "deploy"), "deployment.failed");
  assert.equal(deploymentLifecycleEventType(buildDeployment({ status: "replaced" }), "revert"), "revert.failed");
});
