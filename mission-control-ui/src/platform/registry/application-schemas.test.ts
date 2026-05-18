import assert from "node:assert/strict";
import test from "node:test";
import { PlatformApplicationDefinitionSchema } from "./application-schemas";

const nativeApplicationPayload = {
  applicationId: "overview",
  title: "Overview",
  description: "Mission overview dashboard.",
  iconKey: "layout-dashboard",
  iconColor: "#38bdf8",
  iconBackground: "rgba(56, 189, 248, 0.16)",
  applicationType: "native",
  routePath: "/apps/overview",
  loaderKey: "overview",
  embeddedUrl: null,
  proxyBasePath: null,
  version: "0.1.0",
  enabled: true,
  iframeSandbox: null,
  iframeAllow: null,
  sortOrder: 10,
  owner: "space-ops-apps",
  capabilities: ["telemetry-overview"],
  healthStatus: "unknown",
  deploymentStatus: "seeded",
};

test("PlatformApplicationDefinitionSchema accepts backend-null optional embedded fields", () => {
  const parsed = PlatformApplicationDefinitionSchema.parse(nativeApplicationPayload);

  assert.equal(parsed.embeddedUrl, undefined);
  assert.equal(parsed.proxyBasePath, undefined);
  assert.equal(parsed.iframeSandbox, undefined);
  assert.equal(parsed.iframeAllow, undefined);
});

test("PlatformApplicationDefinitionSchema still rejects non-string optional embedded fields", () => {
  const parsed = PlatformApplicationDefinitionSchema.safeParse({
    ...nativeApplicationPayload,
    embeddedUrl: 123,
  });

  assert.equal(parsed.success, false);
});

test("PlatformApplicationDefinitionSchema still rejects invalid required registry fields", () => {
  const parsed = PlatformApplicationDefinitionSchema.safeParse({
    ...nativeApplicationPayload,
    sortOrder: "10",
  });

  assert.equal(parsed.success, false);
});
