"use client";

import type { ChatEvent } from "@/applications/ai-engineer/types";

export function ActionTimeline({ events }: { events: ChatEvent[] }) {
  return (
    <aside className="border-border bg-card w-full rounded-md border p-3">
      <h3 className="mb-2 text-sm font-semibold">Action Timeline</h3>
      <div className="max-h-72 space-y-2 overflow-auto text-xs">
        {events.length === 0 ? <p className="text-muted-foreground">No events yet.</p> : null}
        {[...events]
          .sort((a, b) => a.sequence - b.sequence)
          .map((event) => (
            <div key={event.id} className="border-border rounded border p-2">
              <div className="font-medium">{event.sequence}. {event.event_type}</div>
              <div className="text-muted-foreground">{event.emitted_by}</div>
            </div>
          ))}
      </div>
    </aside>
  );
}
