import assert from "node:assert/strict";
import test from "node:test";

import { statusLabel } from "./tool-permission-card";

test("permission lifecycle labels distinguish approved and running", () => {
  assert.equal(statusLabel.approved, "Approved");
  assert.equal(statusLabel.executing, "Running");
  assert.equal(statusLabel.pending, "Pending approval");
});
