import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EmbeddedApplicationHost } from "./EmbeddedApplicationHost";
import type { PlatformApplicationDefinition } from "../registry/application-types";

function buildEmbeddedApplication(
  overrides: Partial<PlatformApplicationDefinition> = {},
): PlatformApplicationDefinition {
  return {
    applicationId: "workspace",
    title: "Workspace",
    description: "Open VS Code Server workspace.",
    iconKey: "folder-code",
    iconColor: "#38bdf8",
    iconBackground: "rgba(56, 189, 248, 0.16)",
    applicationType: "embedded",
    routePath: "/apps/workspace",
    version: "0.1.0",
    enabled: true,
    iframeSandbox: "allow-scripts allow-same-origin allow-forms",
    iframeAllow: "",
    sortOrder: 60,
    owner: "space-ops-apps",
    capabilities: ["development-workspace"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
    ...overrides,
  };
}

test("EmbeddedApplicationHost falls back to proxyBasePath for iframe src", () => {
  const markup = renderToStaticMarkup(
    <EmbeddedApplicationHost
      application={buildEmbeddedApplication({
        embeddedUrl: undefined,
        proxyBasePath: "/workspace",
      })}
    />,
  );

  assert.match(markup, /data-testid="embedded-application-frame"/);
  assert.match(markup, /src="\/workspace"/);
  assert.doesNotMatch(markup, /Application unavailable/);
});

test("EmbeddedApplicationHost renders unavailable state without any iframe target", () => {
  const markup = renderToStaticMarkup(
    <EmbeddedApplicationHost
      application={buildEmbeddedApplication({
        embeddedUrl: undefined,
        proxyBasePath: undefined,
      })}
    />,
  );

  assert.match(markup, /Application unavailable/);
  assert.match(markup, /The embedded application is missing its iframe target\./);
  assert.doesNotMatch(markup, /data-testid="embedded-application-frame"/);
});
