"use client";

import { Check, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  approveToolPermission,
  denyToolPermission,
  getToolPermissionStatus,
  type ToolPermissionStatusResponse,
} from "@/applications/ai-engineer/lib/tool-permission-client";
import type { ChatEvent, ChatMessageToolPermissionPart } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";

type PermissionDisplayStatus = "checking" | "pending" | "approved" | "executing" | "denied" | "completed" | "failed" | "unknown";

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function statusFromEvents(part: ChatMessageToolPermissionPart, events: ChatEvent[]): { status: PermissionDisplayStatus; reason?: string } {
  const related = events.filter(
    (event) =>
      event.tool_call_id === part.toolCallId ||
      event.payload.permission_request_id === part.permissionRequestId ||
      event.payload.tool_call_id === part.toolCallId,
  );
  const failed = related.find((event) => event.event_type === "tool.failed" || event.event_type === "deployment.failed" || event.event_type === "deployment.timeout");
  if (failed) {
    const reason = typeof failed.payload.failure_reason === "string" ? failed.payload.failure_reason : typeof failed.payload.message === "string" ? failed.payload.message : undefined;
    return { status: "failed", reason };
  }
  if (related.some((event) => event.event_type === "tool.completed")) return { status: "completed" };
  if (related.some((event) => event.event_type === "tool.permission_denied")) return { status: "denied" };
  if (related.some((event) => event.event_type === "tool.started")) return { status: "executing" };
  if (related.some((event) => event.event_type === "tool.permission_approved")) return { status: "approved" };
  return { status: "pending" };
}

function displayStatusFromResponse(response: ToolPermissionStatusResponse): PermissionDisplayStatus {
  if (response.status === "executed") return "completed";
  if (response.status === "expired") return "failed";
  return response.status;
}

const statusLabel: Record<PermissionDisplayStatus, string> = {
  checking: "Checking permission...",
  pending: "Pending approval",
  approved: "Approved",
  executing: "Approved",
  denied: "Denied",
  completed: "Completed",
  failed: "Failed",
  unknown: "Status unavailable",
};

export function ToolPermissionCard({ part, events, compact = false }: { part: ChatMessageToolPermissionPart; events: ChatEvent[]; compact?: boolean }) {
  const eventState = useMemo(() => statusFromEvents(part, events), [events, part]);
  const [localStatus, setLocalStatus] = useState<"idle" | "approving" | "denying">("idle");
  const [serverStatus, setServerStatus] = useState<PermissionDisplayStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventDerivedStatus = eventState.status === "pending" ? "checking" : eventState.status;
  const displayStatus = serverStatus ?? eventDerivedStatus;
  const isBusy = localStatus === "approving" || localStatus === "denying";
  const isActionable = serverStatus === "pending" && !compact && !isBusy;
  const details = part.prompt.details ?? {};
  const failureReason = error ?? eventState.reason;

  useEffect(() => {
    let cancelled = false;
    getToolPermissionStatus(part.permissionRequestId)
      .then((response) => {
        if (!cancelled) setServerStatus(displayStatusFromResponse(response));
      })
      .catch((err) => {
        if (cancelled) return;
        setServerStatus(eventState.status === "pending" ? "unknown" : eventState.status);
        setError(err instanceof Error ? err.message : "Failed to load permission status");
      });
    return () => {
      cancelled = true;
    };
  }, [eventState.status, part.permissionRequestId]);

  const approve = async () => {
    if (!isActionable || isBusy) return;
    setError(null);
    setLocalStatus("approving");
    try {
      const response = await approveToolPermission(part.permissionRequestId);
      setServerStatus(displayStatusFromResponse(response));
      setLocalStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve permission");
      setServerStatus("failed");
      setLocalStatus("idle");
    }
  };

  const deny = async () => {
    if (!isActionable || isBusy) return;
    setError(null);
    setLocalStatus("denying");
    try {
      const response = await denyToolPermission(part.permissionRequestId);
      setServerStatus(displayStatusFromResponse(response));
      setLocalStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny permission");
      setServerStatus("failed");
      setLocalStatus("idle");
    }
  };

  return (
    <div className="border-border/50 bg-card/80 w-[min(100%,560px)] rounded-lg border p-3 shadow-[var(--shadow-card)]" data-testid="tool-permission-card" data-permission-state={displayStatus} data-compact={compact || !isActionable}>
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <ShieldAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] leading-5 font-semibold">{part.prompt.title ?? "Approve tool execution?"}</h3>
            <span className="text-muted-foreground shrink-0 text-[11px]">{statusLabel[displayStatus]}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-[12px] leading-5">{part.prompt.description ?? `The AI Engineer wants to run ${part.toolName}.`}</p>
          {Object.keys(details).length > 0 && isActionable ? (
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
          {failureReason && displayStatus === "failed" ? <p className="text-destructive mt-2 text-[11px]">{failureReason}</p> : null}
          {isActionable ? <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={approve} disabled={isBusy}>
              <Check className="size-3.5" />
              {part.prompt.primary_action ?? "Approve"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={deny} disabled={isBusy}>
              <X className="size-3.5" />
              {part.prompt.secondary_action ?? "Cancel"}
            </Button>
          </div> : null}
        </div>
      </div>
    </div>
  );
}
