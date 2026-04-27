import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
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

test("next config rewrites keep workspace on the internal transport path only", () => {
  assert.doesNotMatch(configSource, /source:\s*"\/workspace"/);
  assert.doesNotMatch(configSource, /source:\s*"\/workspace\/:path\*"/);
  assert.match(configSource, /source:\s*"\/_embedded\/workspace"/);
  assert.match(configSource, /source:\s*"\/_embedded\/workspace\/:path\*"/);
});

test("next config redirects top-level workspace transport navigation back into the shell", () => {
  assert.match(configSource, /async redirects\(\)/);
  assert.match(configSource, /source:\s*"\/_embedded\/workspace"/);
  assert.match(configSource, /destination:\s*"\/apps\/workspace"/);
  assert.match(configSource, /key:\s*"sec-fetch-dest"/);
  assert.match(configSource, /value:\s*"document"/);
  assert.equal(existsSync(join(projectRoot, "src", "middleware.ts")), false);
  assert.equal(existsSync(join(projectRoot, "src", "proxy.ts")), false);
  assert.equal(existsSync(join(projectRoot, "middleware.ts")), false);
  assert.equal(existsSync(join(projectRoot, "proxy.ts")), false);
});
