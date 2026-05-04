"use client";

import { FileText } from "lucide-react";

import { AiEngineerActivityItem } from "@/applications/ai-engineer/components/ai-engineer-activity-item";
import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import { getAttachmentDisplayLabel, getAttachmentDisplayStatus } from "@/applications/ai-engineer/lib/ui-event-formatting";
import type { AttachmentStatus, ChatEvent } from "@/applications/ai-engineer/types";

const hiddenEventTypes = new Set(["message.delta"]);

function DocumentActivity({ attachment }: { attachment: AttachmentStatus }) {
  return (
    <div className="border-border/40 bg-background/70 rounded-xl border p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-2">
        <div className="bg-muted/70 text-muted-foreground ring-border/50 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ring-1">
          <FileText className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-medium">{attachment.fileName}</div>
            <AiEngineerStatusPill status={getAttachmentDisplayStatus(attachment)} label={getAttachmentDisplayLabel(attachment)} />
          </div>
          {attachment.message ? <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px]">{attachment.message}</p> : null}
          {attachment.documentId ? <p className="text-muted-foreground mt-1 truncate text-[10px]">Document {attachment.documentId}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AiEngineerActivityPanel({ events, attachments }: { events: ChatEvent[]; attachments: AttachmentStatus[] }) {
  const visibleEvents = events.filter((event) => !hiddenEventTypes.has(event.event_type));
  const noActivity = visibleEvents.length === 0 && attachments.length === 0;

  return (
    <div className="flex h-full w-full flex-col" data-testid="ai-engineer-activity-panel">
      <div className="border-border/40 flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div>
          <h3 className="text-sm font-medium">Activity</h3>
          <p className="text-muted-foreground text-[11px]">Tools, context, and documents</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {noActivity ? <p className="text-muted-foreground px-1 py-2 text-xs">No activity yet.</p> : null}
        {attachments.length > 0 ? (
          <section className="mb-4">
            <h4 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">Documents</h4>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <DocumentActivity key={attachment.id ?? `${attachment.fileName}-${attachment.documentId ?? attachment.status}`} attachment={attachment} />
              ))}
            </div>
          </section>
        ) : null}
        {visibleEvents.length > 0 ? (
          <section>
            <h4 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">Runs</h4>
            <div className="space-y-2">
              {visibleEvents
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.sequence - a.sequence)
                .map((event) => (
                  <AiEngineerActivityItem key={event.id} event={event} />
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
