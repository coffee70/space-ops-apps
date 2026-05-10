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

import {
  AI_ENGINEER_MODEL_FILTER_LABELS,
  filterAiEngineerModels,
  formatAiEngineerModelDetailLines,
  trySelectAiEngineerModel,
  type AiEngineerModelFilterKey,
} from "./model-picker-filter";

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
  const [filter, setFilter] = useState<AiEngineerModelFilterKey>("all");
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

  const filtered = useMemo(
    () => filterAiEngineerModels(models, query, filter, providerRail),
    [models, query, filter, providerRail],
  );

  const chipLabel = loadError
    ? "Model unavailable"
    : isLoading
      ? "Loading models…"
      : models.length === 0
        ? "No models available"
        : selected?.name ?? "Select model";

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
            {(Object.keys(AI_ENGINEER_MODEL_FILTER_LABELS) as AiEngineerModelFilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                  filter === key ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {AI_ENGINEER_MODEL_FILTER_LABELS[key]}
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
              {filtered.length === 0 ? (
                <li className="text-muted-foreground px-2 py-6 text-center text-[11px] leading-relaxed">
                  {models.length === 0
                    ? "No models were returned from the stack catalog. Confirm agent-runtime is running, the model registry file is mounted in the container, and GET /intelligence/agent/models succeeds."
                    : "No models match your search or filters. Clear the search box or reset filters."}
                </li>
              ) : null}
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
                      )}
                    >
                      <div className={cn("flex items-start gap-2", dim && "opacity-45")}>
                        <button
                          type="button"
                          disabled={!canSelect}
                          onClick={() => {
                            trySelectAiEngineerModel(m, onSelect, () => setOpen(false));
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
                          {formatAiEngineerModelDetailLines(m).map((line, idx) => (
                            <div key={idx}>{line}</div>
                          ))}
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
