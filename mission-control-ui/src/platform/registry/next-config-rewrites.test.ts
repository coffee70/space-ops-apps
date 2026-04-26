import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const configSource = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

test("next config rewrites expose only application registry routes", () => {
  assert.match(configSource, /source:\s*"\/registry\/applications"/);
  assert.match(configSource, /source:\s*"\/registry\/applications\/:applicationId"/);
  assert.doesNotMatch(configSource, /source:\s*"\/registry\/:path\*"/);
  assert.doesNotMatch(configSource, /source:\s*"\/registry\/services/);
  assert.doesNotMatch(configSource, /source:\s*"\/registry\/units/);
});

test("next config rewrites do not expose internal runtime services", () => {
  assert.doesNotMatch(configSource, /source:\s*"\/internal\/:path\*"/);
  assert.doesNotMatch(configSource, /source:\s*"\/internal\/runtime-services/);
});
