import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const configSource = readFileSync(join(projectRoot, "next.config.ts"), "utf8");

/**
 * Routing for platform/registry/runtime-application/telemetry traffic now lives in the
 * Layer 1 platform-edge-proxy (Caddy). The Next.js application config must stay free of
 * those rewrites so the edge proxy is the only place that owns API path-to-host wiring.
 */

test("next config does not own platform API rewrites (now provided by the edge proxy)", () => {
  assert.doesNotMatch(configSource, /async\s+rewrites/);
  assert.doesNotMatch(configSource, /afterFiles:/);
  assert.doesNotMatch(configSource, /fallback:/);
  assert.doesNotMatch(configSource, /\$\{apiServerUrl\}/);
  assert.doesNotMatch(configSource, /\$\{controlPlaneServerUrl\}/);
});

test("next config does not expose registry, telemetry, or runtime-service rewrites", () => {
  assert.doesNotMatch(configSource, /source:\s*"\/registry\//);
  assert.doesNotMatch(configSource, /source:\s*"\/telemetry/);
  assert.doesNotMatch(configSource, /source:\s*"\/internal\/runtime-services/);
  assert.doesNotMatch(configSource, /source:\s*"\/runtime-applications/);
  assert.doesNotMatch(configSource, /source:\s*"\/vehicle-configs/);
  assert.doesNotMatch(configSource, /source:\s*"\/simulator/);
});

test("next config does not expose direct embedded transport rewrites", () => {
  assert.doesNotMatch(configSource, /source:\s*"\/_embedded\//);
  assert.doesNotMatch(configSource, /OPENVSCODE_SERVER_URL/);
  assert.doesNotMatch(configSource, /openvscode-server/);
});

test("next config does not introduce Next.js middleware or proxy entry points", () => {
  assert.equal(existsSync(join(projectRoot, "src", "middleware.ts")), false);
  assert.equal(existsSync(join(projectRoot, "src", "proxy.ts")), false);
  assert.equal(existsSync(join(projectRoot, "middleware.ts")), false);
  assert.equal(existsSync(join(projectRoot, "proxy.ts")), false);
});
