import assert from "node:assert/strict";
import test from "node:test";

import { getCodeRepositoryReadiness } from "./code-repository-control-panel-section";
import { shouldPollCodeRepositoryStatus, type CodeRepositoryStatus } from "@/lib/query-hooks";

function buildStatus(overrides: Partial<CodeRepositoryStatus> = {}): CodeRepositoryStatus {
  return {
    id: "repo-1",
    name: "space-ops-platform",
    source_uri: "project/space-ops-platform",
    layer: "platform",
    default_branch: "main",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    chunk_count: 42,
    index_status: "ready",
    indexed_commit_sha: "abc123",
    current_commit_sha: "abc123",
    file_count: 10,
    skipped_file_count: 0,
    failed_file_count: 0,
    last_error: null,
    index_requested_at: "2026-01-01T00:00:00Z",
    index_started_at: "2026-01-01T00:00:01Z",
    index_completed_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

test("getCodeRepositoryReadiness only reports ready for matching indexed and current commits with chunks", () => {
  assert.equal(getCodeRepositoryReadiness(buildStatus()), "ready");
  assert.equal(getCodeRepositoryReadiness(buildStatus({ indexed_commit_sha: "old" })), "not-indexed");
  assert.equal(getCodeRepositoryReadiness(buildStatus({ current_commit_sha: null })), "not-indexed");
  assert.equal(getCodeRepositoryReadiness(buildStatus({ chunk_count: 0 })), "not-indexed");
});

test("getCodeRepositoryReadiness maps active and terminal backend states", () => {
  assert.equal(getCodeRepositoryReadiness(buildStatus({ index_status: "queued", indexed_commit_sha: null })), "queued");
  assert.equal(getCodeRepositoryReadiness(buildStatus({ index_status: "indexing", indexed_commit_sha: null })), "indexing");
  assert.equal(getCodeRepositoryReadiness(buildStatus({ index_status: "failed", last_error: "boom" })), "failed");
  assert.equal(getCodeRepositoryReadiness(null), "not-indexed");
});

test("shouldPollCodeRepositoryStatus follows non-ready repository states", () => {
  assert.equal(shouldPollCodeRepositoryStatus(buildStatus({ index_status: "queued" })), true);
  assert.equal(shouldPollCodeRepositoryStatus(buildStatus({ index_status: "indexing" })), true);
  assert.equal(shouldPollCodeRepositoryStatus(buildStatus({ chunk_count: 0 })), true);
  assert.equal(shouldPollCodeRepositoryStatus(buildStatus({ indexed_commit_sha: "old" })), true);
  assert.equal(shouldPollCodeRepositoryStatus(buildStatus()), false);
  assert.equal(shouldPollCodeRepositoryStatus(buildStatus({ index_status: "failed" })), false);
});
