"use client";

import {
  Ban,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Code,
  Cpu,
  Eye,
  FileText,
  Filter,
  Globe,
  Info,
  Lock,
  ScrollText,
  Sparkles,
  Star,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AiEngineerModelOption, ModelCapability } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  AI_ENGINEER_MODEL_FILTER_LABELS,
  AI_ENGINEER_MODEL_FILTER_ORDER,
  filterAiEngineerModels,
  formatAiEngineerModelDetailLines,
  getActiveModelFilterCount,
  toggleAiEngineerModelFilter,
  trySelectAiEngineerModel,
  type AiEngineerModelFilterKey,
} from "./model-picker-filter";
import { classifyProviderRailEntry, type ProviderRailKind } from "./provider-rail-meta";

const FILTER_ROW_ICONS = {
  enabled: CheckCircle2,
  disabled: Ban,
  recommended: Star,
  fast: Zap,
  reasoning: Brain,
  coding: Wrench,
  long_context: ScrollText,
  vision: Eye,
  local: Cpu,
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
  return (
    <span className="font-mono text-[11px] font-semibold tracking-tight text-emerald-500 dark:text-emerald-400">
      {"$".repeat(n)}
    </span>
  );
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

/** Presentational; exported for static markup tests. */
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

const railGlyphFrame =
  "flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-[10px] font-semibold leading-none";

function ProviderRailGlyph({ kind }: { kind: ProviderRailKind }) {
  switch (kind) {
    case "recommended":
      return <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />;
    case "openai":
      return (
        <span className={railGlyphFrame} aria-hidden>
          OA
        </span>
      );
    case "anthropic":
      return (
        <span className={railGlyphFrame} aria-hidden>
          A
        </span>
      );
    case "google":
      return <Sparkles className="size-4 text-sky-400" aria-hidden />;
    case "xai":
      return (
        <span className={railGlyphFrame} aria-hidden>
          xA
        </span>
      );
    case "local_hardware":
      return <Cpu className="size-4 text-emerald-400" aria-hidden />;
    default:
      return <Bot className="text-muted-foreground size-4" aria-hidden />;
  }
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
  const [activeFilters, setActiveFilters] = useState<AiEngineerModelFilterKey[]>([]);
  const [providerRail, setProviderRail] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filterCount = getActiveModelFilterCount(activeFilters);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const selected = models.find((m) => m.id === selectedModelId);

  const providers = useMemo(() => {
    const map = new Map<string, { id: string; label: string; providerType?: string }>();
    for (const m of models) {
      if (!map.has(m.providerRef)) {
        map.set(m.providerRef, { id: m.providerRef, label: m.provider, providerType: m.providerType });
      }
    }
    const list = [...map.values()];
    list.sort((a, b) => {
      const ai = a.label.toLowerCase().includes("openai") ? 0 : a.label.toLowerCase().includes("anthropic") ? 1 : 2;
      const bi = b.label.toLowerCase().includes("openai") ? 0 : b.label.toLowerCase().includes("anthropic") ? 1 : 2;
      return ai - bi || a.label.localeCompare(b.label);
    });
    return [{ id: "__recommended", label: "Recommended", providerType: undefined }, ...list];
  }, [models]);

  const filtered = useMemo(
    () => filterAiEngineerModels(models, query, activeFilters, providerRail),
    [models, query, activeFilters, providerRail],
  );

  const chipLabel = loadError
    ? "Models are temporarily unavailable"
    : isLoading
      ? "Loading available models…"
      : models.length === 0
        ? "No models available"
        : selected?.name ?? "Select model";

  const emptyListMessage = () => {
    if (loadError) {
      return (
        <>
          <p className="font-medium">Models are temporarily unavailable.</p>
          <p className="text-muted-foreground mt-1">Try again in a moment or contact your system administrator.</p>
        </>
      );
    }
    if (isLoading && models.length === 0) {
      return <p className="font-medium">Loading available models…</p>;
    }
    if (models.length === 0) {
      return (
        <>
          <p className="font-medium">No models are available for this workspace.</p>
          <p className="text-muted-foreground mt-1">Contact your system administrator if you expected to see a model here.</p>
        </>
      );
    }
    return (
      <>
        <p className="font-medium">No models match your search.</p>
        <p className="text-muted-foreground mt-1">Try a different search or filter.</p>
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "border-border/40 bg-background/95 z-50 flex h-[min(76vh,680px)] w-[min(calc(100vw-1rem),780px)] flex-col overflow-hidden rounded-2xl border p-0 shadow-xl backdrop-blur-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        )}
      >
        <div className="border-border/30 shrink-0 border-b px-3 py-2.5">
          <div className="flex flex-row items-center gap-2">
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="bg-background/60 border-border/40 h-9 min-w-0 flex-1 text-xs"
              data-testid="ai-engineer-model-search"
              aria-label="Search models"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-testid="ai-engineer-model-filter-trigger"
                    className={cn(
                      "border-border/50 bg-background/80 text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl",
                      filterCount > 0 && "border-primary/55 bg-muted/70 text-foreground shadow-sm",
                    )}
                    aria-label="Filter models"
                  >
                    <Filter className="size-4 opacity-90" aria-hidden />
                  </Button>
                  {filterCount > 0 ? (
                    <span
                      className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums shadow-sm"
                      aria-hidden
                    >
                      {filterCount > 9 ? "9+" : filterCount}
                    </span>
                  ) : null}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuItem
                  className="gap-2 text-xs"
                  onSelect={() => {
                    setActiveFilters([]);
                  }}
                >
                  <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  All models
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {AI_ENGINEER_MODEL_FILTER_ORDER.map((key) => {
                  const Icon = FILTER_ROW_ICONS[key];
                  const checked = activeFilters.includes(key);
                  return (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checkAlign="end"
                      checked={checked}
                      onCheckedChange={() => {
                        setActiveFilters((prev) => toggleAiEngineerModelFilter(prev, key));
                      }}
                      onSelect={(e) => e.preventDefault()}
                      className="gap-2.5 py-2 pl-2 text-xs"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent",
                          checked ? "bg-primary/15 text-primary" : "bg-muted/80 text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      {AI_ENGINEER_MODEL_FILTER_LABELS[key]}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside
            className="border-border/30 bg-card/30 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 py-2 md:w-[52px] md:flex-col md:overflow-y-auto md:border-r md:border-b-0"
            aria-label="Providers"
          >
            {providers.map((p) => {
              const kind = classifyProviderRailEntry({
                railId: p.id,
                providerLabel: p.label,
                providerType: p.providerType,
              });
              const railActive = providerRail === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={railActive}
                  onClick={() => setProviderRail(p.id === providerRail ? null : p.id)}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                    railActive
                      ? "border-primary bg-primary/15 text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <ProviderRailGlyph kind={kind} />
                </button>
              );
            })}
          </aside>

          <div className="relative flex min-h-0 flex-1 flex-col">
            {filtered.length === 0 ? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center px-6 py-10 text-center text-[11px] leading-relaxed">
                {emptyListMessage()}
              </div>
            ) : (
              <ul className="flex flex-col gap-1 overflow-y-auto p-2" data-testid="ai-engineer-model-list">
                {filtered.map((m) => {
                  const isSelected = selectedModelId === m.id;
                  const dim = !m.enabled || !m.isAvailable;
                  const canSelect = m.enabled && m.isAvailable;
                  return (
                    <li key={m.id}>
                      <div
                        className={cn(
                          "flex flex-col gap-1 rounded-xl border px-3 py-2 transition-colors",
                          canSelect &&
                            "border-border/35 hover:border-border/60 hover:bg-muted/45 active:bg-muted/65 cursor-default",
                          canSelect &&
                            isSelected &&
                            "border-primary/55 bg-primary/10 shadow-sm hover:bg-primary/14 hover:border-primary/45",
                          dim && "border-border/25 cursor-default opacity-55 hover:border-border/25 hover:bg-transparent active:bg-transparent",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            disabled={!canSelect}
                            onClick={() => {
                              trySelectAiEngineerModel(m, onSelect, () => setOpen(false));
                            }}
                            className={cn(
                              "flex min-w-0 flex-1 flex-col items-start rounded-lg border border-transparent px-1 py-0.5 text-left transition-colors",
                              canSelect && "cursor-pointer hover:bg-transparent active:bg-transparent",
                              !canSelect && "cursor-not-allowed",
                            )}
                            data-testid={`ai-engineer-model-row-${m.id}`}
                          >
                            <div className="flex w-full flex-wrap items-center gap-2">
                              <span className="text-[13px] font-medium">{m.name}</span>
                              <span className="text-muted-foreground text-[11px]">{m.provider}</span>
                              <CostDots tier={m.costTier} />
                              {(m.recommendedFor.includes("demo-safe") || m.recommendedFor.includes("coding") || m.isDefault) && (
                                <span className="text-[11px] text-amber-400" aria-hidden>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground rounded-sm p-0.5"
                                  aria-label={`Technical details for ${m.name}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Info className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[320px] space-y-1 px-3 py-2 text-left text-[11px] leading-snug">
                                {formatAiEngineerModelDetailLines(m).map((line, idx) => (
                                  <div key={idx}>{line}</div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        {dim && m.disabledReason ? <AiEngineerModelDisabledReason modelId={m.id} reason={m.disabledReason} /> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
