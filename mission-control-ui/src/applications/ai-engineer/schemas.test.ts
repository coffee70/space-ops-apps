import assert from "node:assert/strict";
import test from "node:test";

import { ConversationDetailSchema, ListAiEngineerModelsResponseSchema } from "./schemas";

const modelOption = {
  id: "openai-gpt-5-1-mini",
  providerRef: "openai-main",
  providerType: "openai",
  providerModelId: "gpt-5.1-mini",
  name: "GPT-5.1 Mini",
  provider: "OpenAI",
  description: null,
  enabled: true,
  isAvailable: true,
  disabledReason: null,
  isDefault: true,
  defaultFor: ["chat"],
  governance: {
    allowedModes: ["read_only", "governed_execute"],
    dataBoundary: "external_api",
  },
  contextWindow: null,
  maxOutputTokens: null,
  inputModalities: ["text"],
  outputModalities: ["text"],
  supportedParameters: [],
  capabilities: ["text", "tool-use"],
  pricing: {
    inputPerMillionTokens: null,
    outputPerMillionTokens: null,
    currency: "USD",
  },
  qualityTier: "advanced",
  costTier: "$",
  speedTier: "fast",
  reasoningTier: "light",
  recommendedFor: ["chat"],
  metadataSources: ["config"],
};

test("AI Engineer model schema accepts governed execution mode", () => {
  const result = ListAiEngineerModelsResponseSchema.safeParse({
    default_model_id: modelOption.id,
    models: [modelOption],
    metadata: {
      registrySource: "config",
      metadataResolvers: ["fallback"],
      cached: true,
      updatedAt: "2026-05-16T00:00:00.000Z",
    },
  });

  assert.equal(result.success, true);
});

test("AI Engineer model schema rejects invalid execution modes", () => {
  const result = ListAiEngineerModelsResponseSchema.safeParse({
    default_model_id: modelOption.id,
    models: [
      {
        ...modelOption,
        governance: {
          allowedModes: ["totally_invalid_mode"],
          dataBoundary: "external_api",
        },
      },
    ],
    metadata: {
      registrySource: "config",
      metadataResolvers: ["fallback"],
      cached: true,
      updatedAt: "2026-05-16T00:00:00.000Z",
    },
  });

  assert.equal(result.success, false);
});

test("AI Engineer conversation schema accepts governed execution mode", () => {
  const result = ConversationDetailSchema.safeParse({
    id: "conversation-1",
    title: "Governed run",
    mission_id: null,
    vehicle_id: null,
    execution_mode: "governed_execute",
    created_at: "2026-05-16T00:00:00.000Z",
    updated_at: "2026-05-16T00:00:00.000Z",
    messages: [],
    events: [],
  });

  assert.equal(result.success, true);
});
