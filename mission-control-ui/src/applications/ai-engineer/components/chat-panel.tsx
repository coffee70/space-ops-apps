"use client";

import { ChatComposer } from "@/applications/ai-engineer/components/chat-composer";
import { ChatTranscript } from "@/applications/ai-engineer/components/chat-transcript";
import type { AttachmentStatus, ChatMessage, ExecutionMode } from "@/applications/ai-engineer/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  attachments: AttachmentStatus[];
  onSend: (message: string, files: File[]) => Promise<void>;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
}

export function ChatPanel({ messages, attachments, onSend, executionMode, onExecutionModeChange }: ChatPanelProps) {
  return (
    <section className="border-border bg-card flex min-h-[560px] flex-col rounded-md border p-3">
      <ChatTranscript messages={messages} />
      <ChatComposer
        uploadedCount={attachments.length}
        onSend={onSend}
        executionMode={executionMode}
        onExecutionModeChange={onExecutionModeChange}
      />
    </section>
  );
}
