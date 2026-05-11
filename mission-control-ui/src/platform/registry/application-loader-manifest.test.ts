import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { applicationLoaderManifest } from "./application-loader-manifest.generated";

test("application loader manifest includes retained native applications", () => {
  assert.deepEqual(Object.keys(applicationLoaderManifest).sort(), [
    "ai-engineer",
    "control-panel",
    "overview",
    "planning",
    "telemetry",
  ]);
});

test("control-panel seed loaderKey matches generated loader manifest key", () => {
  const seedPath = resolve(process.cwd(), "src/applications/control-panel/application.seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as {
    applicationId: string;
    routePath: string;
    loaderKey: string;
  };
  assert.equal(seed.applicationId, "control-panel");
  assert.equal(seed.routePath, "/apps/control-panel");
  assert.equal(seed.loaderKey, "control-panel");
  assert.equal(typeof applicationLoaderManifest[seed.loaderKey], "function");
});

test("ai-engineer seed loaderKey matches generated loader manifest key", () => {
  const seedPath = resolve(process.cwd(), "src/applications/ai-engineer/application.seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as { loaderKey: string };
  assert.equal(seed.loaderKey, "ai-engineer");
  assert.equal(typeof applicationLoaderManifest[seed.loaderKey], "function");
});
