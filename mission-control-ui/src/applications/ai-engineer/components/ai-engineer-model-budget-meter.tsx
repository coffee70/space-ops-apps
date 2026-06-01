"use client";

import { Gauge } from "lucide-react";

import { formatPercent, formatReset, formatTokenCount } from "@/applications/ai-engineer/lib/model-budget";
import type { ModelBudgetSnapshot, ModelBudgetStatus } from "@/applications/ai-engineer/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function clampedPercent(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.max(0, Math.min(1, value));
}

function statusClass(status: ModelBudgetStatus | "normal") {
  if (status === "exhausted" || status === "throttled" || status === "danger") return "text-destructive";
  if (status === "watch") return "text-amber-500";
  if (status === "unknown") return "text-muted-foreground";
  return "text-emerald-500";
}

function worstStatus(snapshot: ModelBudgetSnapshot | null): ModelBudgetStatus {
  if (!snapshot) return "unknown";
  const order: ModelBudgetStatus[] = ["unknown", "normal", "watch", "danger", "exhausted", "throttled"];
  return order.indexOf(snapshot.throughput.status) > order.indexOf(snapshot.context.status)
    ? snapshot.throughput.status
    : snapshot.context.status;
}

function Ring({ value, radius, strokeWidth, className, dashed = false }: { value: number; radius: number; strokeWidth: number; className: string; dashed?: boolean }) {
  const circumference = 2 * Math.PI * radius;
  return (
    <circle
      cx="16"
      cy="16"
      r={radius}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashed ? "2 3" : circumference}
      strokeDashoffset={dashed ? 0 : circumference * (1 - value)}
      className={cn("origin-center -rotate-90 transition-all duration-300", className)}
    />
  );
}

function Bar({ label, percent, status }: { label: string; percent: number | null; status: ModelBudgetStatus }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", statusClass(status))}>{formatPercent(percent)}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div className={cn("h-full rounded-full", statusClass(status), "bg-current")} style={{ width: `${clampedPercent(percent) * 100}%` }} />
      </div>
    </div>
  );
}

export function AiEngineerModelBudgetMeter({
  snapshot,
  isStreaming = false,
}: {
  snapshot: ModelBudgetSnapshot | null;
  isStreaming?: boolean;
}) {
  const status = worstStatus(snapshot);
  const contextPercent = snapshot?.context.percent_used ?? null;
  const throughputPercent = snapshot?.throughput.percent_used ?? null;
  const aria = snapshot
    ? `Model budget: context ${formatPercent(contextPercent)} used, throughput ${formatPercent(throughputPercent)} used`
    : "Model budget unavailable";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="ai-engineer-model-budget-meter"
          aria-label={aria}
          className={cn(
            "border-border/60 bg-background/70 relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-transform hover:scale-105",
            statusClass(status),
            isStreaming && status !== "unknown" ? "animate-pulse" : "",
          )}
        >
          <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6">
            <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-15" />
            <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-15" />
            <Ring value={clampedPercent(contextPercent)} radius={12} strokeWidth={2.4} className={statusClass(snapshot?.context.status ?? "unknown")} dashed={!snapshot || snapshot.context.status === "unknown"} />
            <Ring value={clampedPercent(throughputPercent)} radius={7} strokeWidth={2.4} className={statusClass(snapshot?.throughput.status ?? "unknown")} dashed={!snapshot || snapshot.throughput.status === "unknown"} />
          </svg>
          {!snapshot ? <Gauge className="text-muted-foreground/70 absolute size-3" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 space-y-3 p-3 text-[12px]">
        <div>
          <div className="font-medium">Model budget</div>
          <div className="text-muted-foreground text-[11px]">
            {snapshot ? `${snapshot.provider_type} · ${snapshot.provider_model_id}` : "Model budget unavailable"}
          </div>
        </div>
        {snapshot ? (
          <>
            <Bar label="Context" percent={snapshot.context.percent_used} status={snapshot.context.status} />
            <div className="text-muted-foreground flex items-center justify-between gap-3 text-[11px]">
              <span>
                {formatTokenCount(snapshot.context.used_tokens)} used / {formatTokenCount(snapshot.context.limit_tokens)} total
              </span>
              <span>{formatTokenCount(snapshot.context.remaining_tokens)} remaining</span>
            </div>
            <Bar label="Throughput" percent={snapshot.throughput.percent_used} status={snapshot.throughput.status} />
            <div className="text-muted-foreground flex items-center justify-between gap-3 text-[11px]">
              <span>
                {formatTokenCount(snapshot.throughput.used_tokens)} used / {formatTokenCount(snapshot.throughput.limit_tokens)} TPM
              </span>
              <span>{formatTokenCount(snapshot.throughput.remaining_tokens)} remaining</span>
            </div>
            <div className="text-muted-foreground text-[11px]">
              {snapshot.throughput.status === "throttled"
                ? `Provider throttled this run · ${formatReset({ resetAt: snapshot.throughput.reset_at, secondsUntilReset: snapshot.throughput.seconds_until_reset })}`
                : snapshot.throughput.window_seconds
                  ? `Rolling ${snapshot.throughput.window_seconds}s window · ${formatReset({ resetAt: snapshot.throughput.reset_at, secondsUntilReset: snapshot.throughput.seconds_until_reset })}`
                  : "Throughput budget not configured for this provider."}
            </div>
            <div className="text-muted-foreground border-border/50 border-t pt-2 text-[10px]">
              Context {snapshot.context.measurement_source.replaceAll("_", " ")} · Throughput {snapshot.throughput.measurement_source.replaceAll("_", " ")}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-[11px]">Context and throughput metadata have not been reported for this run yet.</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
