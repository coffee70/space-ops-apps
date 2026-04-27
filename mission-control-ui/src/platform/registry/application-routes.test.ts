import assert from "node:assert/strict";
import test from "node:test";
import { validateApplicationPathSegments } from "./application-routes";

test("validateApplicationPathSegments accepts valid application subpaths", () => {
  const validPaths = [
    [],
    ["source-1"],
    ["telemetry-channel"],
    ["BatteryVoltage"],
    ["source_1"],
    ["channel.name"],
  ];

  for (const pathSegments of validPaths) {
    assert.deepEqual(validateApplicationPathSegments(pathSegments), pathSegments);
  }
});

test("validateApplicationPathSegments rejects traversal, separators, protocols, and control characters", () => {
  const invalidPaths = [
    [".."],
    ["."],
    ["%2e%2e"],
    ["%252e%252e"],
    ["a%2fb"],
    ["a%5cb"],
    ["a/b"],
    ["a\\b"],
    ["http:evil"],
    ["https:evil"],
    ["http://evil.example"],
    ["//evil.example"],
    ["\u0000"],
  ];

  for (const pathSegments of invalidPaths) {
    assert.equal(validateApplicationPathSegments(pathSegments), null);
  }
});

test("validateApplicationPathSegments rejects unreasonably long segments", () => {
  assert.equal(validateApplicationPathSegments(["a".repeat(256)]), null);
});
