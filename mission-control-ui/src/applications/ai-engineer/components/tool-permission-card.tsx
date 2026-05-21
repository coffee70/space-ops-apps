"use client";

import { Check, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";

import { approveToolPermission, denyToolPermission } from "@/applications/ai-engineer/lib/tool-permission-client";
import type { ChatEvent, ChatMessageToolPermissionPart } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function statusFromEvents(part: ChatMessageToolPermissionPart, events: ChatEvent[]): "pending" | "approved" | "denied" | "completed" | "failed" {
  const related = events.filter(
    (event) =>
      event.tool_call_id === part.toolCallId ||
      event.payload.permission_request_id === part.permissionRequestId ||
      event.payload.tool_call_id === part.toolCallId,
  );
  if (related.some((event) => event.event_type === "tool.failed")) return "failed";
  if (related.some((event) => event.event_type === "tool.completed")) return "completed";
  if (related.some((event) => event.event_type === "tool.permission_denied")) return "denied";
  if (related.some((event) => event.event_type === "tool.permission_approved")) return "approved";
  return "pending";
}

export function ToolPermissionCard({ part, events }: { part: ChatMessageToolPermissionPart; events: ChatEvent[] }) {
  const eventStatus = useMemo(() => statusFromEvents(part, events), [events, part]);
  const [localStatus, setLocalStatus] = useState<"idle" | "approving" | "denying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const isResolved = eventStatus === "approved" || eventStatus === "denied" || eventStatus === "completed" || eventStatus === "failed";
  const isBusy = localStatus === "approving" || localStatus === "denying";
  const details = part.prompt.details ?? {};

  const approve = async () => {
    setError(null);
    setLocalStatus("approving");
    try {
      await approveToolPermission(part.permissionRequestId, part.approvalToken);
      setLocalStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve permission");
      setLocalStatus("error");
    }
  };

  const deny = async () => {
    setError(null);
    setLocalStatus("denying");
    try {
      await denyToolPermission(part.permissionRequestId, part.approvalToken);
      setLocalStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny permission");
      setLocalStatus("error");
    }
  };

  return (
    <div className="border-border/50 bg-card/80 w-[min(100%,560px)] rounded-lg border p-3 shadow-[var(--shadow-card)]" data-testid="tool-permission-card">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <ShieldAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] leading-5 font-semibold">{part.prompt.title ?? "Approve tool execution?"}</h3>
            <span className="text-muted-foreground shrink-0 text-[11px] capitalize">{eventStatus.replace("_", " ")}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-[12px] leading-5">{part.prompt.description ?? `The AI Engineer wants to run ${part.toolName}.`}</p>
          {Object.keys(details).length > 0 ? (
            <dl className="border-border/40 mt-3 grid gap-1.5 border-t pt-3 text-[11px]">
              {Object.entries(details)
                .filter(([, value]) => value !== undefined)
                .slice(0, 8)
                .map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                    <dt className="text-muted-foreground truncate">{key.replaceAll("_", " ")}</dt>
                    <dd className="truncate font-medium">{formatValue(value)}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
          {error ? <p className="text-destructive mt-2 text-[11px]">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={approve} disabled={isResolved || isBusy}>
              <Check className="size-3.5" />
              {localStatus === "approving" ? "Approving" : part.prompt.primary_action ?? "Approve"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={deny} disabled={isResolved || isBusy}>
              <X className="size-3.5" />
              {localStatus === "denying" ? "Cancelling" : part.prompt.secondary_action ?? "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
