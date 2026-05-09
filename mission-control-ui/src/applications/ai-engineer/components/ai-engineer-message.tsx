"use client";

import { FileText, Sparkles, Wrench } from "lucide-react";

import { AiEngineerMarkdown } from "@/applications/ai-engineer/components/ai-engineer-markdown";
import { AiEngineerStatusPill } from "@/applications/ai-engineer/components/ai-engineer-status-pill";
import { formatFileSize } from "@/applications/ai-engineer/lib/file-formatting";
import { getEventDisplayDescription, getEventDisplayStatus, getEventDisplayTitle } from "@/applications/ai-engineer/lib/ui-event-formatting";
import type { ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";

function AssistantAvatar() {
  return (
    <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
      <div className="bg-muted/60 text-muted-foreground ring-border/50 flex size-7 items-center justify-center rounded-lg ring-1">
        <Sparkles className="size-3.5" />
      </div>
    </div>
  );
}

function MessageAttachments({ message }: { message: ChatMessage }) {
  if (!message.attachments?.length) return null;
  return (
    <div className="flex max-w-[min(80%,56ch)] flex-wrap justify-end gap-2">
      {message.attachments.map((attachment) => (
        <div key={attachment.id} className="border-border/40 bg-card/80 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] shadow-[var(--shadow-card)]">
          <FileText className="text-muted-foreground size-3.5" />
          <span className="max-w-36 truncate">{attachment.fileName}</span>
          {attachment.size ? <span className="text-muted-foreground">{formatFileSize(attachment.size)}</span> : null}
        </div>
      ))}
    </div>
  );
}

function InlineEventCards({ events }: { events: ChatEvent[] }) {
  const inlineEvents = events.filter((event) =>
    [
      "tool.started",
      "tool.completed",
      "tool.failed",
      "context.resolved",
      "document.ingestion_completed",
      "code.index_completed",
      "navigation.requested",
      "change.summary",
    ].includes(event.event_type),
  );
  if (inlineEvents.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {inlineEvents.slice(-4).map((event) => (
        <div key={event.id} className="border-border/40 bg-card/70 w-[min(100%,520px)] rounded-xl border px-3 py-2 text-[11px] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{getEventDisplayTitle(event)}</span>
            <AiEngineerStatusPill status={getEventDisplayStatus(event)} />
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2">{getEventDisplayDescription(event)}</p>
        </div>
      ))}
    </div>
  );
}

export function AiEngineerMessage({ message, events = [] }: { message: ChatMessage; events?: ChatEvent[] }) {
  const isEmptyStreamingAssistant = message.role === "assistant" && message.status === "streaming" && message.content.trim().length === 0;

  if (message.role === "user") {
    return (
      <div className="group/message fade-up w-full" data-role="user" data-testid="ai-engineer-message-user">
        <div className="flex flex-col items-end gap-2">
          <MessageAttachments message={message} />
          <div className="border-border/30 from-secondary to-muted w-fit max-w-[min(80%,56ch)] overflow-hidden rounded-2xl rounded-br-lg border bg-gradient-to-br px-3.5 py-2 text-[13px] leading-[1.65] break-words shadow-[var(--shadow-card)]">
            <AiEngineerMarkdown content={message.content} />
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "tool") {
    return (
      <div className="border-border/40 bg-card/70 ml-10 w-[min(100%,520px)] rounded-xl border p-3 text-xs shadow-[var(--shadow-card)]" data-role="tool">
        <div className="text-muted-foreground mb-2 flex items-center gap-2">
          <Wrench className="size-3.5" />
          <span>Tool result</span>
        </div>
        <AiEngineerMarkdown content={message.content} />
      </div>
    );
  }

  return (
    <div className="group/message fade-up w-full" data-role="assistant" data-testid="ai-engineer-message-assistant">
      <div className="flex items-start gap-3">
        <AssistantAvatar />
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-[13px] leading-[1.65]">
          <div data-testid="ai-engineer-assistant-message">
            {isEmptyStreamingAssistant ? (
              <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
                <span className="shimmer font-medium">Thinking...</span>
              </div>
            ) : (
              <AiEngineerMarkdown content={message.content} />
            )}
          </div>
          <InlineEventCards events={events} />
        </div>
      </div>
    </div>
  );
}
