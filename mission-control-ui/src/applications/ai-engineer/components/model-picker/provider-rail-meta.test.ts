import assert from "node:assert/strict";
import test from "node:test";

import { classifyProviderRailEntry, type ProviderRailKind } from "./provider-rail-meta";

function assertKind(params: Parameters<typeof classifyProviderRailEntry>[0], expected: ProviderRailKind) {
  assert.equal(classifyProviderRailEntry(params), expected);
}

test("recommended rail id", () => {
  assertKind({ railId: "__recommended", providerLabel: "" }, "recommended");
});

test("classifies OpenAI from providerType or label", () => {
  assertKind({ railId: "openai-main", providerLabel: "OpenAI", providerType: "openai" }, "openai");
  assertKind({ railId: "x", providerLabel: "OpenAI" }, "openai");
});

test("classifies Anthropic", () => {
  assertKind({ railId: "anthropic-main", providerLabel: "Anthropic", providerType: "anthropic" }, "anthropic");
  assertKind({ railId: "a", providerLabel: "Anthropic Claude" }, "anthropic");
});

test("classifies Google / Gemini", () => {
  assertKind({ railId: "google-main", providerLabel: "Google", providerType: "google" }, "google");
  assertKind({ railId: "g", providerLabel: "Gemini" }, "google");
});

test("classifies xAI / Grok", () => {
  assertKind({ railId: "xai-main", providerLabel: "xAI" }, "xai");
  assertKind({ railId: "openrouter-xai", providerLabel: "Grok" }, "xai");
});

test("classifies bare metal / local stack endpoints", () => {
  assertKind({ railId: "local-baremetal", providerLabel: "Local Bare Metal", providerType: "openai-compatible" }, "local_hardware");
});

test("unknown falls through", () => {
  assertKind({ railId: "custom-vendor", providerLabel: "Some Vendor" }, "unknown");
});
