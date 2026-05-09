import assert from "node:assert/strict";
import test from "node:test";

import { isTerminalDeploymentStatus, pollDeploymentUntilTerminal } from "./change-preview-client";
import type { DeploymentRecord } from "./change-preview-types";

function buildDeployment(overrides: Partial<DeploymentRecord> = {}): DeploymentRecord {
  return {
    deployment_id: overrides.deployment_id ?? "dep_1",
    unit_id: overrides.unit_id ?? "unit",
    branch: overrides.branch ?? "main",
    commit_sha: overrides.commit_sha ?? "abc",
    status: overrides.status ?? "pending",
    health_status: overrides.health_status ?? "unknown",
    failure_reason: overrides.failure_reason ?? null,
  };
}

test("isTerminalDeploymentStatus matches healthy/failed/replaced", () => {
  assert.equal(isTerminalDeploymentStatus("healthy"), true);
  assert.equal(isTerminalDeploymentStatus("failed"), true);
  assert.equal(isTerminalDeploymentStatus("replaced"), true);
  assert.equal(isTerminalDeploymentStatus("pending"), false);
  assert.equal(isTerminalDeploymentStatus("building"), false);
});

test("pollDeploymentUntilTerminal stops on healthy and emits onUpdate per call", async () => {
  const sequence = [
    buildDeployment({ status: "pending" }),
    buildDeployment({ status: "building" }),
    buildDeployment({ status: "healthy", health_status: "passing" }),
  ];
  const updates: DeploymentRecord[] = [];
  let calls = 0;
  const result = await pollDeploymentUntilTerminal("dep_1", {
    intervalMs: 1,
    timeoutMs: 1000,
    onUpdate: (deployment) => updates.push(deployment),
    fetcher: async () => {
      const next = sequence[Math.min(calls, sequence.length - 1)];
      calls += 1;
      return next;
    },
  });
  assert.equal(result.status, "healthy");
  assert.equal(updates.length, 3);
  assert.equal(updates[0]?.status, "pending");
  assert.equal(updates[2]?.status, "healthy");
});

test("pollDeploymentUntilTerminal returns failed deployment without throwing", async () => {
  const sequence = [
    buildDeployment({ status: "pending" }),
    buildDeployment({ status: "failed", failure_reason: "broken" }),
  ];
  let calls = 0;
  const result = await pollDeploymentUntilTerminal("dep_1", {
    intervalMs: 1,
    timeoutMs: 1000,
    fetcher: async () => {
      const next = sequence[Math.min(calls, sequence.length - 1)];
      calls += 1;
      return next;
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.failure_reason, "broken");
});

test("pollDeploymentUntilTerminal honors timeoutMs", async () => {
  await assert.rejects(
    pollDeploymentUntilTerminal("dep_1", {
      intervalMs: 1,
      timeoutMs: 5,
      fetcher: async () => buildDeployment({ status: "pending" }),
    }),
    /did not reach a terminal state/,
  );
});

test("pollDeploymentUntilTerminal honors abort signal", async () => {
  const controller = new AbortController();
  const promise = pollDeploymentUntilTerminal("dep_1", {
    intervalMs: 50,
    timeoutMs: 1000,
    signal: controller.signal,
    fetcher: async () => buildDeployment({ status: "pending" }),
  });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(promise, /aborted/i);
});
