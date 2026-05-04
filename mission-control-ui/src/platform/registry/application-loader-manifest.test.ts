import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { applicationLoaderManifest } from "./application-loader-manifest.generated";

test("application loader manifest includes ai-engineer", () => {
  assert.equal(typeof applicationLoaderManifest["ai-engineer"], "function");
});

test("application loader manifest excludes deleted battery efficiency app", () => {
  assert.equal(applicationLoaderManifest["battery-efficiency"], undefined);
});

test("ai-engineer seed loaderKey matches generated loader manifest key", () => {
  const seedPath = resolve(process.cwd(), "src/applications/ai-engineer/application.seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as { loaderKey: string };
  assert.equal(seed.loaderKey, "ai-engineer");
  assert.equal(typeof applicationLoaderManifest[seed.loaderKey], "function");
});
