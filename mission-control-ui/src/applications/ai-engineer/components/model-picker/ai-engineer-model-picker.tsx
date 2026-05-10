"use client";

import {
  Brain,
  ChevronDown,
  Code,
  Eye,
  FileText,
  Globe,
  Info,
  Lock,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { AiEngineerModelOption, ModelCapability } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterKey =
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

const FILTER_LABELS: Record<FilterKey, string> = {
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

function CostDots({ tier }: { tier: AiEngineerModelOption["costTier"] }) {
  const map: Record<string, number> = {
    $: 1,
    $$: 2,
    $$$: 3,
    $$$$: 4,
    internal: 2,
    unknown: 2,
  };
  const n = map[tier] ?? 2;
  return <span className="text-muted-foreground font-mono text-[10px] tracking-tight">{"$".repeat(n)}</span>;
}

function CapabilityIcon({ cap }: { cap: ModelCapability }) {
  const common = "size-3.5 shrink-0";
  switch (cap) {
    case "vision":
      return <Eye className={cn(common, "text-sky-400")} aria-hidden />;
    case "reasoning":
      return <Brain className={cn(common, "text-violet-400")} aria-hidden />;
    case "tool-use":
      return <Wrench className={cn(common, "text-amber-400")} aria-hidden />;
    case "file-input":
      return <FileText className={cn(common, "text-emerald-400")} aria-hidden />;
    case "web-search":
      return <Globe className={cn(common, "text-cyan-400")} aria-hidden />;
    case "json":
      return <Code className={cn(common, "text-fuchsia-400")} aria-hidden />;
    case "code":
      return <Terminal className={cn(common, "text-lime-400")} aria-hidden />;
    default:
      return null;
  }
}

/** Presentational; exported for static markup tests (dialog content is portaled and not in SSR string). */
export function AiEngineerModelDisabledReason({ modelId, reason }: { modelId: string; reason: string }) {
  return (
    <p className="text-muted-foreground text-[10px]" data-testid={`ai-engineer-model-disabled-${modelId}`}>
      {reason}
    </p>
  );
}

function BoundaryBadge({ boundary }: { boundary: AiEngineerModelOption["governance"]["dataBoundary"] }) {
  const label =
    boundary === "local_airgapped"
      ? "Air-gapped"
      : boundary === "external_api"
        ? "External API"
        : boundary === "private_cloud"
          ? "Private cloud"
          : "Unknown";
  const icon = boundary === "local_airgapped" ? <Lock className="size-3" /> : null;
  return (
    <span className="border-border/60 bg-muted/40 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px]">
      {icon}
      {label}
    </span>
  );
}

export function AiEngineerModelPicker({
  models,
  selectedModelId,
  onSelect,
  disabled = false,
  isLoading = false,
  loadError = null,
}: {
  models: AiEngineerModelOption[];
  selectedModelId: string | null;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadError?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [providerRail, setProviderRail] = useState<string | null>(null);

  const selected = models.find((m) => m.id === selectedModelId);

  const providers = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const m of models) {
      if (!map.has(m.providerRef)) {
        map.set(m.providerRef, { id: m.providerRef, label: m.provider });
      }
    }
    const list = [...map.values()];
    list.sort((a, b) => {
      const ai = a.label.toLowerCase().includes("openai") ? 0 : a.label.toLowerCase().includes("anthropic") ? 1 : 2;
      const bi = b.label.toLowerCase().includes("openai") ? 0 : b.label.toLowerCase().includes("anthropic") ? 1 : 2;
      return ai - bi || a.label.localeCompare(b.label);
    });
    return [{ id: "__recommended", label: "Recommended" }, ...list];
  }, [models]);

  const filtered = useMemo(() => {
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
  }, [models, query, filter, providerRail]);

  const chipLabel = loadError ? "Model unavailable" : isLoading ? "Loading models…" : selected?.name ?? "Select model";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled || isLoading}
          data-testid="ai-engineer-model-trigger"
          className="border-border/50 bg-background/80 text-muted-foreground hover:text-foreground h-7 max-w-[min(46vw,220px)] gap-1.5 px-2 font-normal"
          aria-label="Choose model"
        >
          <Sparkles className="size-3 shrink-0 opacity-70" />
          <span className="truncate text-[11px]">{chipLabel}</span>
          {selected ? <CostDots tier={selected.costTier} /> : null}
          {selected?.recommendedFor.includes("demo-safe") || selected?.isDefault ? (
            <span className="text-amber-400" aria-hidden>
              ★
            </span>
          ) : null}
          <ChevronDown className="size-3 shrink-0 opacity-60" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className={cn(
          "border-border/40 bg-background/95 gap-0 overflow-hidden p-0 shadow-2xl backdrop-blur-md sm:max-w-none",
          "w-[min(92vw,780px)] max-h-[min(80vh,720px)]",
        )}
      >
        <div className="from-primary/25 via-background to-background border-border/30 border-b bg-gradient-to-r px-4 py-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Mission stack models</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Approved models for this deployment. Disabled entries are visible but not selectable.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models, providers, capabilities…"
              className="bg-background/60 border-border/40 h-8 text-xs"
              data-testid="ai-engineer-model-search"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                  filter === key ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside
            className="border-border/30 bg-card/40 flex shrink-0 flex-row gap-1 overflow-x-auto border-b p-2 md:w-44 md:flex-col md:overflow-y-auto md:border-r md:border-b-0"
            aria-label="Providers"
          >
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProviderRail(p.id === providerRail ? null : p.id)}
                className={cn(
                  "rounded-lg px-2 py-1 text-left text-[11px] whitespace-nowrap transition-colors md:whitespace-normal",
                  providerRail === p.id ? "bg-foreground text-background" : "hover:bg-muted/60 text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </aside>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            <ul className="flex flex-col gap-1" data-testid="ai-engineer-model-list">
              {filtered.map((m) => {
                const isSelected = selectedModelId === m.id;
                const dim = !m.enabled || !m.isAvailable;
                const canSelect = m.enabled && m.isAvailable;
                return (
                  <li key={m.id}>
                    <div
                      className={cn(
                        "border-border/40 flex flex-col gap-1 rounded-xl border px-3 py-2 transition-colors",
                        isSelected && "border-primary/50 bg-primary/5",
                        dim && "opacity-45",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          disabled={!canSelect}
                          onClick={() => {
                            if (!canSelect) return;
                            onSelect(m.id);
                            localStorage.setItem("ai-engineer.selectedModelId", m.id);
                            setOpen(false);
                          }}
                          className="flex min-w-0 flex-1 flex-col items-start text-left"
                          data-testid={`ai-engineer-model-row-${m.id}`}
                        >
                          <div className="flex w-full flex-wrap items-center gap-2">
                            <span className="text-[13px] font-medium">{m.name}</span>
                            <span className="text-muted-foreground text-[11px]">{m.provider}</span>
                            <CostDots tier={m.costTier} />
                            {(m.recommendedFor.includes("demo-safe") || m.recommendedFor.includes("coding") || m.isDefault) && (
                              <span className="text-amber-400 text-[11px]" aria-hidden>
                                ★
                              </span>
                            )}
                          </div>
                          {m.description ? (
                            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">{m.description}</p>
                          ) : null}
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className="flex flex-wrap justify-end gap-0.5">
                            {m.capabilities.slice(0, 6).map((c) => (
                              <CapabilityIcon key={c} cap={c} />
                            ))}
                          </div>
                          <BoundaryBadge boundary={m.governance.dataBoundary} />
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Details"
                            onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                          >
                            <Info className="size-4" />
                          </button>
                        </div>
                      </div>
                      {dim && m.disabledReason ? <AiEngineerModelDisabledReason modelId={m.id} reason={m.disabledReason} /> : null}
                      {expandedId === m.id ? (
                        <div
                          className="border-border/30 bg-muted/20 mt-1 rounded-lg border p-2 text-[10px]"
                          data-testid={`ai-engineer-model-details-${m.id}`}
                        >
                          <div>Provider model id: {m.providerModelId}</div>
                          <div>Context: {m.contextWindow ?? "unknown"}</div>
                          <div>Max output: {m.maxOutputTokens ?? "unknown"}</div>
                          <div>
                            Pricing in/out per 1M: {m.pricing.inputPerMillionTokens ?? "—"} / {m.pricing.outputPerMillionTokens ?? "—"}{" "}
                            {m.pricing.currency ?? ""}
                          </div>
                          <div>Allowed modes: {m.governance.allowedModes.join(", ")}</div>
                          <div>Data boundary: {m.governance.dataBoundary}</div>
                          <div>Metadata sources: {m.metadataSources.join(", ")}</div>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
