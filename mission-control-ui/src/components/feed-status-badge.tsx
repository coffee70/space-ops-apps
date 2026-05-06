"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeedState } from "@/lib/feed-status";

export interface FeedStatusBadgeProps {
  state: FeedState;
  className?: string;
}

export function FeedStatusBadge({
  state,
  className,
}: FeedStatusBadgeProps) {
  if (state === "connected") {
    return (
      <Badge
        variant="success"
        className={cn("text-xs", className)}
        data-testid="telemetry-feed-status"
        data-feed-state="connected"
      >
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        Live
      </Badge>
    );
  }

  if (state === "degraded") {
    return (
      <Badge
        variant="secondary"
        className={cn("text-xs", className)}
        data-testid="telemetry-feed-status"
        data-feed-state="degraded"
      >
        Degraded
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className={cn("text-xs", className)}
      data-testid="telemetry-feed-status"
      data-feed-state="disconnected"
    >
      No data
    </Badge>
  );
}
