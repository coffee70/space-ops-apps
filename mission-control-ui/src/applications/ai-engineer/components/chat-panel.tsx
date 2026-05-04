"use client";

import { useState } from "react";

import { AiEngineerComposer } from "@/applications/ai-engineer/components/ai-engineer-composer";
import { AiEngineerMessages } from "@/applications/ai-engineer/components/ai-engineer-messages";
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

export function ChatPanel({ messages, onSend, executionMode, onExecutionModeChange, disabled = false }: ChatPanelProps) {
  const [composerText, setComposerText] = useState("");

  return (
    <section className="bg-background flex min-h-[560px] flex-col overflow-hidden rounded-2xl">
      <AiEngineerMessages messages={messages} events={[]} onSuggestionSelect={setComposerText} />
      <div className="mx-auto w-full max-w-4xl px-2 pb-3 md:px-4">
        <AiEngineerComposer
          input={composerText}
          onInputChange={setComposerText}
          onSend={onSend}
          executionMode={executionMode}
          onExecutionModeChange={onExecutionModeChange}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
