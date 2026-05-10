/** Visual grouping for the provider rail (icons/monograms only — labels come from accessibility props). */

export type ProviderRailKind =
  | "recommended"
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "local_hardware"
  | "unknown";

export function classifyProviderRailEntry(params: {
  railId: string;
  providerLabel: string;
  providerType?: string;
}): ProviderRailKind {
  if (params.railId === "__recommended") return "recommended";

  const label = params.providerLabel.toLowerCase();
  const ref = params.railId.toLowerCase();
  const pt = params.providerType?.toLowerCase() ?? "";

  if (pt === "google") return "google";
  if (pt === "anthropic") return "anthropic";
  if (pt === "openai") return "openai";

  if (label.includes("xai") || label.includes("grok") || ref.includes("xai")) return "xai";
  if (label.includes("gemini") || /\bgoogle\b/.test(label)) return "google";
  if (label.includes("anthropic") || label.includes("claude")) return "anthropic";

  const looksLocalHardware =
    ref.includes("baremetal") ||
    ref.includes("local-bare") ||
    ref.includes("local_bare") ||
    label.includes("bare metal") ||
    label.includes("bare-metal") ||
    label.includes("air-gapped") ||
    label.includes("air gapped") ||
    (label.includes("local") && (label.includes("metal") || label.includes("bare")));

  if (looksLocalHardware) return "local_hardware";

  if (label.includes("openai") || ref.includes("openai")) return "openai";

  return "unknown";
}
