import assert from "node:assert/strict";
import test from "node:test";

import { getControlPanelRoute } from "./entry";

test("Control Panel native app routes code repository app path to the Code Repository section", () => {
  assert.equal(getControlPanelRoute(["code-repository"]), "code-repository");
});

test("Control Panel native app keeps unknown app paths on Sources", () => {
  assert.equal(getControlPanelRoute(["unknown"]), "sources");
});
