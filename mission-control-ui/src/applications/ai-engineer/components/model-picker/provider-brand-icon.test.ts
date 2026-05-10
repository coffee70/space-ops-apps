import assert from "node:assert/strict";
import test from "node:test";

import { siAnthropic, siGooglegemini, siMeta, siMistralai, siMoonshotai } from "simple-icons";

import { getProviderRailIconDescriptor } from "./provider-brand-icon";

test("OpenAI maps to embedded brand mark (Simple Icons has no main OpenAI icon)", () => {
  assert.deepEqual(getProviderRailIconDescriptor("openai"), { source: "openai-mark" });
});

test("Anthropic maps to Simple Icons Anthropic", () => {
  assert.deepEqual(getProviderRailIconDescriptor("anthropic"), {
    source: "simple-icon",
    brandTitle: siAnthropic.title,
  });
});

test("Google/Gemini maps to Simple Icons Google Gemini", () => {
  assert.deepEqual(getProviderRailIconDescriptor("google"), {
    source: "simple-icon",
    brandTitle: siGooglegemini.title,
  });
});

test("Meta maps to Simple Icons Meta", () => {
  assert.deepEqual(getProviderRailIconDescriptor("meta"), {
    source: "simple-icon",
    brandTitle: siMeta.title,
  });
});

test("Mistral maps to Simple Icons Mistral AI", () => {
  assert.deepEqual(getProviderRailIconDescriptor("mistral"), {
    source: "simple-icon",
    brandTitle: siMistralai.title,
  });
});

test("Moonshot maps to Simple Icons Moonshot AI", () => {
  assert.deepEqual(getProviderRailIconDescriptor("moonshot"), {
    source: "simple-icon",
    brandTitle: siMoonshotai.title,
  });
});

test("xAI maps to monogram fallback", () => {
  assert.deepEqual(getProviderRailIconDescriptor("xai"), { source: "monogram", text: "xAI" });
});

test("local hardware maps to Cpu lucide fallback", () => {
  assert.deepEqual(getProviderRailIconDescriptor("local_hardware"), { source: "lucide", name: "cpu" });
});

test("unknown maps to Bot lucide fallback", () => {
  assert.deepEqual(getProviderRailIconDescriptor("unknown"), { source: "lucide", name: "bot" });
});
