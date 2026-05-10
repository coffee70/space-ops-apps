import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEngineerModelDisabledReason, AiEngineerModelPicker } from "./ai-engineer-model-picker";
import type { AiEngineerModelOption } from "@/applications/ai-engineer/types";

const SAMPLE_OPENAI: AiEngineerModelOption = {
  id: "openai-test",
  providerRef: "openai-main",
  providerType: "openai",
  providerModelId: "gpt-5.5",
  name: "GPT-5.5",
  provider: "OpenAI",
  description: "Test model",
  enabled: true,
  isAvailable: true,
  disabledReason: null,
  isDefault: true,
  defaultFor: ["chat"],
  governance: { allowedModes: ["read_only", "suggest", "execute"], dataBoundary: "external_api" },
  contextWindow: null,
  maxOutputTokens: null,
  inputModalities: ["text"],
  outputModalities: ["text"],
  supportedParameters: [],
  capabilities: ["text", "tool-use"],
  pricing: { inputPerMillionTokens: null, outputPerMillionTokens: null, currency: "USD" },
  qualityTier: "frontier",
  costTier: "$$$",
  speedTier: "balanced",
  reasoningTier: "strong",
  recommendedFor: ["demo-safe"],
  metadataSources: ["fallback-pattern"],
};

test("model trigger shows selected model name", () => {
  const markup = renderToStaticMarkup(
    <AiEngineerModelPicker models={[SAMPLE_OPENAI]} selectedModelId="openai-test" onSelect={() => {}} isLoading={false} loadError={null} />,
  );
  assert.match(markup, /GPT-5\.5/);
  assert.match(markup, /ai-engineer-model-trigger/);
});

test("disabled model rows expose disabled reason text", () => {
  const markup = renderToStaticMarkup(<AiEngineerModelDisabledReason modelId="anthropic-test" reason="No key" />);
  assert.match(markup, /ai-engineer-model-disabled-anthropic-test/);
  assert.match(markup, /No key/);
});
