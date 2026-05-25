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

test("operation status shows deploying for submitted event over healthy baseline runtime", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.submitted")],
      previewRuntime({ is_preview: false, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "running",
      label: "Deploying",
    },
  );
});

test("operation status shows deploying for build started event over healthy baseline runtime", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.build_started")],
      previewRuntime({ is_preview: false, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "running",
      label: "Deploying",
    },
  );
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

test("operation status shows reverting for baseline submitted event over healthy preview runtime", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("baseline.deployment_submitted")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "running",
      label: "Reverting preview...",
    },
  );
});

test("operation status shows reverting for baseline build started event over healthy preview runtime", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("baseline.build_started")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "running",
      label: "Reverting preview...",
    },
  );
});

test("operation status shows baseline active when healthy baseline runtime has no events", () => {
  assert.deepEqual(getAiEngineerOperationStatus([], previewRuntime({ is_preview: false, deployment_status: "healthy", health_status: "passing" })), {
    status: "success",
    label: "Baseline active",
  });
});

test("operation status shows preview active when healthy preview runtime has no events", () => {
  assert.deepEqual(getAiEngineerOperationStatus([], previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" })), {
    status: "success",
    label: "Preview active",
  });
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

test("operation status keeps deployment timeout failed when no deployment id proves runtime identity", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.timeout")],
      previewRuntime({ is_preview: true, deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "failed",
      label: "Preview deploy timed out",
    },
  );
});

test("operation status keeps fresh failed deployment failed when baseline runtime is healthy", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.failed", { deployment_id: "dep_failed" })],
      previewRuntime({ is_preview: false, active_deployment_id: "baseline_1", deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "failed",
      label: "Preview deploy failed",
    },
  );
});

test("operation status keeps failed deployment failed when active runtime deployment differs", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.failed", { deployment_id: "dep_failed" })],
      previewRuntime({ is_preview: true, active_deployment_id: "dep_other", deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "failed",
      label: "Preview deploy failed",
    },
  );
});

test("operation status upgrades deployment failure only when active runtime deployment matches", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.failed", { deployment_id: "dep_1" })],
      previewRuntime({ is_preview: true, active_deployment_id: "dep_1", deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "success",
      label: "Preview active",
    },
  );
});

test("operation status upgrades deployment timeout only when active runtime deployment matches", () => {
  assert.deepEqual(
    getAiEngineerOperationStatus(
      [event("deployment.timeout", { deployment_id: "dep_1" })],
      previewRuntime({ is_preview: true, active_deployment_id: "dep_1", deployment_status: "healthy", health_status: "passing" }),
    ),
    {
      status: "success",
      label: "Preview active",
    },
  );
});
