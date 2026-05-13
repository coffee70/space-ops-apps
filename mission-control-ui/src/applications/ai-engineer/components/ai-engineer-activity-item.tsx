"use client";

import { Bot, FileText, Map, Rocket, Search, Terminal, TriangleAlert, Wrench } from "lucide-react";

import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import {
  getEventDisplayDescription,
  getEventDisplayIcon,
  getEventDisplayStatus,
  getEventDisplayTitle,
} from "@/applications/ai-engineer/lib/ui-event-formatting";
import type { ChatEvent } from "@/applications/ai-engineer/types";

function ActivityIcon({ event }: { event: ChatEvent }) {
  const className = "size-3.5";
  const icon = getEventDisplayIcon(event);
  if (icon === "tool") return <Wrench className={className} />;
  if (icon === "document") return <FileText className={className} />;
  if (icon === "code") return <Terminal className={className} />;
  if (icon === "navigation") return <Map className={className} />;
  if (icon === "context") return <Search className={className} />;
  if (icon === "deployment") return <Rocket className={className} />;
  if (icon === "error") return <TriangleAlert className={className} />;
  return <Bot className={className} />;
}

export function AiEngineerActivityItem({ event }: { event: ChatEvent }) {
  return (
    <div className="border-border bg-card text-card-foreground rounded-md border p-3 shadow-xs" data-testid="ai-engineer-activity-item">
      <div className="flex items-start gap-2">
        <div className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
          <ActivityIcon event={event} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-medium">{getEventDisplayTitle(event)}</div>
            <AiEngineerStatusPill status={getEventDisplayStatus(event)} />
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px]">{getEventDisplayDescription(event)}</p>
        </div>
      </div>
      <details className="mt-2">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px]">Raw event</summary>
        <pre className="bg-muted text-muted-foreground mt-1 max-h-40 overflow-auto rounded-lg p-2 text-[10px]">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}
