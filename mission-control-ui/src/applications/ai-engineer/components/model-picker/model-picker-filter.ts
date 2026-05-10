import type { AiEngineerModelOption } from "@/applications/ai-engineer/types";

/** Toggleable filters (multi-select). Empty array means “all models” for filter predicates. */
export type AiEngineerModelFilterKey =
  | "enabled"
  | "disabled"
  | "recommended"
  | "fast"
  | "reasoning"
  | "coding"
  | "long_context"
  | "vision"
  | "local";

/** Stable order for toggling and display. */
export const AI_ENGINEER_MODEL_FILTER_ORDER: readonly AiEngineerModelFilterKey[] = [
  "enabled",
  "disabled",
  "recommended",
  "fast",
  "reasoning",
  "coding",
  "long_context",
  "vision",
  "local",
] as const;

export const AI_ENGINEER_MODEL_FILTER_LABELS: Record<AiEngineerModelFilterKey, string> = {
  enabled: "Enabled",
  disabled: "Disabled",
  recommended: "Recommended",
  fast: "Fast",
  reasoning: "Reasoning",
  coding: "Coding / tools",
  long_context: "Long context",
  vision: "Vision",
  local: "Local / air-gapped",
};

function passesSingleModelFilter(m: AiEngineerModelOption, key: AiEngineerModelFilterKey): boolean {
  switch (key) {
    case "enabled":
      return m.enabled && m.isAvailable;
    case "disabled":
      return !m.enabled;
    case "recommended":
      return m.recommendedFor.includes("demo-safe") || m.isDefault;
    case "fast":
      return m.speedTier === "fast";
    case "reasoning":
      return m.reasoningTier === "strong" || m.reasoningTier === "light";
    case "coding":
      return m.recommendedFor.includes("coding") || m.capabilities.includes("tool-use");
    case "long_context":
      return (m.contextWindow ?? 0) >= 100_000;
    case "vision":
      return m.capabilities.includes("vision");
    case "local":
      return m.governance.dataBoundary === "local_airgapped";
    default:
      return true;
  }
}

/** Pure filter logic shared with tests (picker UI applies the same rules). `activeFilters` uses AND semantics. */
export function filterAiEngineerModels(
  models: AiEngineerModelOption[],
  query: string,
  activeFilters: AiEngineerModelFilterKey[],
  providerRail: string | null,
): AiEngineerModelOption[] {
  const q = query.trim().toLowerCase();
  return models.filter((m) => {
    if (providerRail === "__recommended") {
      if (!(m.recommendedFor.includes("demo-safe") || m.recommendedFor.includes("coding") || m.isDefault)) return false;
    } else if (providerRail) {
      if (m.providerRef !== providerRail) return false;
    }

    for (const key of activeFilters) {
      if (!passesSingleModelFilter(m, key)) return false;
    }

    if (!q) return true;
    const hay = [
      m.id,
      m.providerModelId,
      m.name,
      m.provider,
      m.description ?? "",
      ...m.capabilities,
      ...m.recommendedFor,
      m.governance.dataBoundary,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function getActiveModelFilterCount(activeFilters: AiEngineerModelFilterKey[]): number {
  return activeFilters.length;
}

/** Toggle one filter key; returns a new array in `AI_ENGINEER_MODEL_FILTER_ORDER`. */
export function toggleAiEngineerModelFilter(
  activeFilters: AiEngineerModelFilterKey[],
  key: AiEngineerModelFilterKey,
): AiEngineerModelFilterKey[] {
  const next = new Set(activeFilters);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return AI_ENGINEER_MODEL_FILTER_ORDER.filter((k) => next.has(k));
}

export function formatAiEngineerModelDetailLines(model: AiEngineerModelOption): string[] {
  return [
    `Provider model id: ${model.providerModelId}`,
    `Context: ${model.contextWindow ?? "unknown"}`,
    `Max output: ${model.maxOutputTokens ?? "unknown"}`,
    `Pricing in/out per 1M: ${model.pricing.inputPerMillionTokens ?? "—"} / ${model.pricing.outputPerMillionTokens ?? "—"} ${model.pricing.currency ?? ""}`.trim(),
    `Allowed modes: ${model.governance.allowedModes.join(", ")}`,
    `Data boundary: ${model.governance.dataBoundary}`,
    `Metadata sources: ${model.metadataSources.join(", ")}`,
  ];
}

/** Returns true when the row should invoke selection + close (picker delegates persistence to the app). */
export function trySelectAiEngineerModel(
  model: AiEngineerModelOption,
  onSelect: (modelId: string) => void,
  requestClose: () => void,
): boolean {
  if (!model.enabled || !model.isAvailable) return false;
  onSelect(model.id);
  requestClose();
  return true;
}
