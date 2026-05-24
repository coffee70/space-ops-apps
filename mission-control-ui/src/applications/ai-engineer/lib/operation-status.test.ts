import assert from "node:assert/strict";
import test from "node:test";

import { getAiEngineerOperationStatus } from "./operation-status";
import type { ChatEvent } from "../types";
import type { ActiveFrontendPreviewRuntimeResponse } from "@/lib/ui-boundary-schemas";

function event(event_type: string, payload: Record<string, unknown> = {}): ChatEvent {
  return {
    id: event_type,
    event_type,
    conversation_id: "conversation-1",
    agent_run_id: "run-1",
    request_id: "request-1",
    tool_call_id: null,
    sequence: 1,
    emitted_by: "tool-execution-service",
    payload,
    created_at: "2026-05-21T00:00:00.000Z",
  };
}

function previewRuntime(overrides: Partial<ActiveFrontendPreviewRuntimeResponse> = {}): ActiveFrontendPreviewRuntimeResponse {
  return {
    is_preview: false,
    frontend_unit_id: "mission-control-frontend-shell",
    active_deployment_id: "dep_1",
    branch: "preview/cyan",
    commit_sha: "abc1234",
    deployment_status: "deploying",
    health_status: "failing",
    baseline_branch: "main",
    baseline_commit_sha: "def5678",
    preview_deployment_id: "dep_1",
    target_application_id: "ai-engineer",
    ...overrides,
  };
}

test("operation status shows deploying for deployment start events", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("deployment.submitted")]), {
    status: "running",
    label: "Deploying",
  });
});

test("operation status shows failed for deployment failures", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("deployment.failed", { failure_reason: "build failed" })]), {
    status: "failed",
    label: "Preview deploy failed",
  });
});

test("operation status shows timed out for deployment timeouts without a healthy preview runtime", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("deployment.timeout")]), {
    status: "failed",
    label: "Preview deploy timed out",
  });
});

test("operation status shows preview active for preview active events", () => {
  assert.deepEqual(getAiEngineerOperationStatus([event("preview.active")]), {
    status: "success",
    label: "Preview active",
  });
});

test("operation status upgrades deploying events to preview active when preview runtime is healthy and passing", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.build_started")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "success",
      label: "Preview active",
    },
  );
});

test("operation status keeps deploying while preview runtime is active but not yet healthy and passing", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.build_started")],
      previewRuntime({ is_preview: true, deployment_status: "deploying", health_status: "starting" }),
    ),
    {
      status: "running",
      label: "Deploying",
    },
  );
});

test("operation status preserves baseline active even if preview runtime still reports a preview", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("baseline.active")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "success",
      label: "Baseline active",
    },
  );
});

test("operation status preserves reverting preview even if preview runtime reports healthy passing", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("revert.requested")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "running",
      label: "Reverting preview...",
    },
  );
});

test("operation status upgrades deployment timeout to preview active when preview runtime is healthy and passing", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.timeout")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "success",
      label: "Preview active",
    },
  );
});

test("operation status upgrades deployment failure to preview active when preview runtime is healthy and passing", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.failed")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "success",
      label: "Preview active",
    },
  );
});
