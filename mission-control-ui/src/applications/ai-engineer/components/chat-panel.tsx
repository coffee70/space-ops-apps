"use client";

import { ChatComposer } from "@/applications/ai-engineer/components/chat-composer";
import { ChatTranscript } from "@/applications/ai-engineer/components/chat-transcript";
import type { AttachmentStatus, ChatMessage, ExecutionMode } from "@/applications/ai-engineer/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  attachments: AttachmentStatus[];
  onSend: (message: string, files: File[]) => Promise<void>;
  onFilesSelected?: (files: File[]) => Promise<void>;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

export function ChatPanel({ messages, attachments, onSend, onFilesSelected, executionMode, onExecutionModeChange, disabled = false }: ChatPanelProps) {
  return (
    <section className="border-border bg-card flex min-h-[560px] flex-col rounded-md border p-3">
      <ChatTranscript messages={messages} />
      <ChatComposer
        uploadedCount={attachments.length}
        onSend={onSend}
        onFilesSelected={onFilesSelected}
        executionMode={executionMode}
        onExecutionModeChange={onExecutionModeChange}
        disabled={disabled}
      />
    </section>
  );
}
