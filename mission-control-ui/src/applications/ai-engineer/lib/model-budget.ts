import { ModelBudgetSnapshotPayloadSchema } from "@/applications/ai-engineer/schemas";
import type { ChatEvent, ModelBudgetSnapshot } from "@/applications/ai-engineer/types";

export function latestModelBudgetSnapshotFromEvents(events: ChatEvent[]): ModelBudgetSnapshot | null {
  for (const event of [...events].reverse()) {
    if (event.event_type !== "model.budget.snapshot") continue;
    const parsed = ModelBudgetSnapshotPayloadSchema.safeParse(event.payload);
    if (parsed.success) return parsed.data;
  }
  return null;
}

export function formatTokenCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "unknown";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "unknown";
  return `${Math.round(value * 100)}%`;
}

export function formatReset(value: { resetAt: string | null; secondsUntilReset: number | null }): string {
  if (value.secondsUntilReset !== null) return `resets in ~${Math.max(0, Math.round(value.secondsUntilReset))}s`;
  if (value.resetAt) {
    const ms = Date.parse(value.resetAt) - Date.now();
    if (Number.isFinite(ms)) return `resets in ~${Math.max(0, Math.round(ms / 1000))}s`;
  }
  return "reset unknown";
}
