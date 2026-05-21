"use client";

import { FileText, Sparkles, Wrench } from "lucide-react";

import { AiEngineerMarkdown } from "@/applications/ai-engineer/components/ai-engineer-markdown";
import { AiEngineerReasoningPanel } from "@/applications/ai-engineer/components/ai-engineer-reasoning-panel";
import { ToolPermissionCard } from "@/applications/ai-engineer/components/tool-permission-card";
import { formatFileSize } from "@/applications/ai-engineer/lib/file-formatting";
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

export interface AiEngineerMessageProps {
  message: ChatMessage;
  events?: ChatEvent[];
}

export function AiEngineerMessage({
  message,
  events = [],
}: AiEngineerMessageProps) {
  const hasReasoning = Boolean(message.reasoning && message.reasoning.content.trim().length > 0);
  const isEmptyStreamingAssistant =
    message.role === "assistant" &&
    message.status === "streaming" &&
    message.content.trim().length === 0 &&
    !hasReasoning;

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

  const permissionPart = message.part?.kind === "tool-permission" ? message.part : undefined;
  const isStreamingAssistantWithContent = message.role === "assistant" && message.status === "streaming" && message.content.trim().length > 0;

  return (
    <div className="group/message fade-up w-full" data-role="assistant" data-testid="ai-engineer-message-assistant">
      <div className="flex items-start gap-3">
        <AssistantAvatar />
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-[13px] leading-[1.65]">
          {permissionPart ? (
            <div data-testid="ai-engineer-tool-permission-message" data-permission-request-id={permissionPart.permissionRequestId}>
              <ToolPermissionCard part={permissionPart} events={events} />
            </div>
          ) : (
            <div data-testid="ai-engineer-assistant-message" className="flex flex-col gap-3">
              {message.reasoning ? <AiEngineerReasoningPanel reasoning={message.reasoning} /> : null}

              {isEmptyStreamingAssistant ? (
                <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
                  <span className="shimmer-text font-medium">Thinking...</span>
                </div>
              ) : message.content.trim().length > 0 ? (
                isStreamingAssistantWithContent ? (
                  <div className="ai-engineer-streaming-assistant">
                    <AiEngineerMarkdown content={message.content} />
                  </div>
                ) : (
                  <AiEngineerMarkdown content={message.content} />
                )
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
