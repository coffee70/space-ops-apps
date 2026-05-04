"use client";

import { groupTimelineEvents } from "@/applications/ai-engineer/lib/agent-events";
import type { ChatEvent } from "@/applications/ai-engineer/types";

const KNOWN_EVENT_TYPES = new Set([
  "run.started",
  "run.completed",
  "run.failed",
  "context.requested",
  "context.resolved",
  "context.failed",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "document.uploaded",
  "document.ingestion_started",
  "document.ingestion_completed",
  "document.ingestion_failed",
  "code.index_started",
  "code.index_completed",
  "code.index_failed",
  "navigation.requested",
  "message.delta",
  "message.completed",
  "error",
]);

function payloadPreview(payload: Record<string, unknown>) {
  return JSON.stringify(payload).slice(0, 240);
}

export function ActionTimeline({ events }: { events: ChatEvent[] }) {
  const groups = groupTimelineEvents(events);

  return (
    <aside className="border-border bg-card w-full rounded-md border p-3">
      <h3 className="mb-2 text-sm font-semibold">Action Timeline</h3>
      <div className="max-h-72 space-y-2 overflow-auto text-xs">
        {events.length === 0 ? <p className="text-muted-foreground">No events yet.</p> : null}
        {groups.map((group) => (
          <section key={group.agentRunId} className="border-border rounded border p-2">
            <div className="mb-2 font-medium">Run {group.agentRunId.slice(0, 8)}</div>
            <div className="space-y-2">
              {group.events.map((event) => (
                <details key={event.id} className="bg-background/50 rounded px-2 py-1" open={KNOWN_EVENT_TYPES.has(event.event_type)}>
                  <summary className="cursor-pointer font-medium">
                    {event.sequence}. {event.event_type}
                    {event.tool_call_id ? <span className="text-muted-foreground"> · tool {event.tool_call_id.slice(0, 8)}</span> : null}
                  </summary>
                  <div className="text-muted-foreground mt-1">{event.emitted_by}</div>
                  <pre className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">{payloadPreview(event.payload)}</pre>
                </details>
              ))}
            </div>
            {group.tools.length > 0 ? (
              <div className="text-muted-foreground mt-2">
                Tools: {group.tools.map((tool) => `${tool.toolCallId.slice(0, 8)} ${tool.latestStatus}`).join(", ")}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </aside>
  );
}
