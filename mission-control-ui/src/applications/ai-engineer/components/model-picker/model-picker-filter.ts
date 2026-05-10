import type { AiEngineerModelOption } from "@/applications/ai-engineer/types";

export type AiEngineerModelFilterKey =
  | "all"
  | "enabled"
  | "disabled"
  | "recommended"
  | "fast"
  | "reasoning"
  | "coding"
  | "long_context"
  | "vision"
  | "local";

export const AI_ENGINEER_MODEL_FILTER_LABELS: Record<AiEngineerModelFilterKey, string> = {
  all: "All",
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

/** Pure filter logic shared with tests (picker UI applies the same rules). */
export function filterAiEngineerModels(
  models: AiEngineerModelOption[],
  query: string,
  filter: AiEngineerModelFilterKey,
  providerRail: string | null,
): AiEngineerModelOption[] {
  const q = query.trim().toLowerCase();
  return models.filter((m) => {
    if (providerRail === "__recommended") {
      if (!(m.recommendedFor.includes("demo-safe") || m.recommendedFor.includes("coding") || m.isDefault)) return false;
    } else if (providerRail) {
      if (m.providerRef !== providerRail) return false;
    }

    if (filter === "enabled" && (!m.enabled || !m.isAvailable)) return false;
    if (filter === "disabled" && m.enabled) return false;
    if (filter === "recommended" && !(m.recommendedFor.includes("demo-safe") || m.isDefault)) return false;
    if (filter === "fast" && m.speedTier !== "fast") return false;
    if (filter === "reasoning" && m.reasoningTier !== "strong" && m.reasoningTier !== "light") return false;
    if (filter === "coding" && !m.recommendedFor.includes("coding") && !m.capabilities.includes("tool-use")) return false;
    if (filter === "long_context" && (m.contextWindow ?? 0) < 100_000) return false;
    if (filter === "vision" && !m.capabilities.includes("vision")) return false;
    if (filter === "local" && m.governance.dataBoundary !== "local_airgapped") return false;

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
