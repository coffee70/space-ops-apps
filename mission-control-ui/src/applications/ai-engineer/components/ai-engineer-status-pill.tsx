"use client";

import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/applications/ai-engineer/lib/ui-event-formatting";

const statusClassName: Record<ActivityStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  info: "bg-muted text-muted-foreground",
};

const defaultLabel: Record<ActivityStatus, string> = {
  pending: "Pending",
  running: "Running",
  success: "Done",
  failed: "Failed",
  info: "Info",
};

export function AiEngineerStatusPill({ status, label }: { status: ActivityStatus; label?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium", statusClassName[status])}>
      {label ?? defaultLabel[status]}
    </span>
  );
}
