import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EmbeddedApplicationHost } from "./embedded-application-host";
import type { PlatformApplicationDefinition } from "../registry/application-types";

function buildEmbeddedApplication(
  overrides: Partial<PlatformApplicationDefinition> = {},
): PlatformApplicationDefinition {
  return {
    applicationId: "external-embedded-test-app",
    title: "External Embedded Test App",
    description: "Synthetic embedded application fixture.",
    iconKey: "monitor-smartphone",
    iconColor: "#38bdf8",
    iconBackground: "rgba(56, 189, 248, 0.16)",
    applicationType: "embedded",
    routePath: "/apps/external-embedded-test-app",
    version: "0.1.0",
    enabled: true,
    iframeSandbox: "allow-scripts allow-same-origin allow-forms",
    iframeAllow: "",
    sortOrder: 60,
    owner: "space-ops-apps",
    capabilities: ["embedded-test"],
    healthStatus: "unknown",
    deploymentStatus: "seeded",
    ...overrides,
  };
}

test("EmbeddedApplicationHost uses embeddedUrl for iframe src", () => {
  const markup = renderToStaticMarkup(
    <EmbeddedApplicationHost
      application={buildEmbeddedApplication({
        embeddedUrl: "/_embedded/external-test-app",
        proxyBasePath: undefined,
      })}
    />,
  );

  assert.match(markup, /data-testid="embedded-application-frame"/);
  assert.match(markup, /src="\/_embedded\/external-test-app"/);
  assert.doesNotMatch(markup, /Application unavailable/);
});

test("EmbeddedApplicationHost falls back to proxyBasePath when embeddedUrl is absent", () => {
  const markup = renderToStaticMarkup(
    <EmbeddedApplicationHost
      application={buildEmbeddedApplication({
        applicationId: "proxy-backed-test-app",
        title: "Proxy Backed Test App",
        routePath: "/apps/proxy-backed-test-app",
        embeddedUrl: undefined,
        proxyBasePath: "/runtime-applications/proxy-backed-test-app",
      })}
    />,
  );

  assert.match(markup, /data-testid="embedded-application-frame"/);
  assert.match(markup, /src="\/runtime-applications\/proxy-backed-test-app"/);
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
