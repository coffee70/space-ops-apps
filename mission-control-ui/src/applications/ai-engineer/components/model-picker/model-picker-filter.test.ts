import assert from "node:assert/strict";
import test from "node:test";

import type { AiEngineerModelOption } from "@/applications/ai-engineer/types";

import {
  filterAiEngineerModels,
  formatAiEngineerModelDetailLines,
  trySelectAiEngineerModel,
} from "./model-picker-filter";

const enabledOpenAi: AiEngineerModelOption = {
  id: "openai-test",
  providerRef: "openai-main",
  providerType: "openai",
  providerModelId: "gpt-5.5",
  name: "GPT-5.5",
  provider: "OpenAI",
  description: "Primary stack model",
  enabled: true,
  isAvailable: true,
  disabledReason: null,
  isDefault: true,
  defaultFor: ["chat"],
  governance: { allowedModes: ["read_only", "suggest", "execute"], dataBoundary: "external_api" },
  contextWindow: 128_000,
  maxOutputTokens: 8192,
  inputModalities: ["text"],
  outputModalities: ["text"],
  supportedParameters: [],
  capabilities: ["text", "tool-use"],
  pricing: { inputPerMillionTokens: 1, outputPerMillionTokens: 2, currency: "USD" },
  qualityTier: "frontier",
  costTier: "$$$",
  speedTier: "balanced",
  reasoningTier: "strong",
  recommendedFor: ["demo-safe"],
  metadataSources: ["fallback-pattern"],
};

const disabledAnthropic: AiEngineerModelOption = {
  ...enabledOpenAi,
  id: "anthropic-test",
  providerRef: "anthropic-main",
  providerType: "anthropic",
  providerModelId: "claude-3",
  name: "Claude",
  provider: "Anthropic",
  enabled: false,
  isAvailable: false,
  disabledReason: "No API key",
  isDefault: false,
  recommendedFor: [],
};

test("search filters models by id substring", () => {
  const out = filterAiEngineerModels([enabledOpenAi, disabledAnthropic], "anthropic", "all", null);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.id, "anthropic-test");
});

test("disabled filter keeps only disabled rows", () => {
  const out = filterAiEngineerModels([enabledOpenAi, disabledAnthropic], "", "disabled", null);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.id, "anthropic-test");
});

test("provider rail restricts by providerRef", () => {
  const out = filterAiEngineerModels([enabledOpenAi, disabledAnthropic], "", "all", "anthropic-main");
  assert.equal(out.length, 1);
  assert.equal(out[0]?.id, "anthropic-test");
});

test("details lines include context, pricing boundary, modes, metadata sources", () => {
  const lines = formatAiEngineerModelDetailLines(enabledOpenAi);
  assert.ok(lines.some((l) => l.includes("gpt-5.5")));
  assert.ok(lines.some((l) => l.includes("128000")));
  assert.ok(lines.some((l) => l.includes("8192")));
  assert.ok(lines.some((l) => l.includes("external_api")));
  assert.ok(lines.some((l) => l.includes("read_only")));
  assert.ok(lines.some((l) => l.includes("fallback-pattern")));
});

test("trySelect invokes onSelect only for enabled available models", () => {
  let selected: string | null = null;
  let closed = 0;
  const onSelect = (id: string) => {
    selected = id;
  };
  const close = () => {
    closed += 1;
  };

  assert.equal(trySelectAiEngineerModel(enabledOpenAi, onSelect, close), true);
  assert.equal(selected, "openai-test");
  assert.equal(closed, 1);

  selected = null;
  closed = 0;
  assert.equal(trySelectAiEngineerModel(disabledAnthropic, onSelect, close), false);
  assert.equal(selected, null);
  assert.equal(closed, 0);
});
