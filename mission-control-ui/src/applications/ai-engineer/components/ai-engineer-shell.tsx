"use client";

import { useState } from "react";

import { AiEngineerActivityPanel } from "@/applications/ai-engineer/components/ai-engineer-activity-panel";
import { AiEngineerComposer } from "@/applications/ai-engineer/components/ai-engineer-composer";
import { AiEngineerHeader } from "@/applications/ai-engineer/components/ai-engineer-header";
import { AiEngineerMessages } from "@/applications/ai-engineer/components/ai-engineer-messages";
import type { AttachmentStatus, ChatEvent, ChatMessage, ExecutionMode } from "@/applications/ai-engineer/types";

export function AiEngineerShell({
  title,
  messages,
  events,
  attachments,
  executionMode,
  onExecutionModeChange,
  onSend,
  disabled = false,
  isStreaming = false,
  isBootstrapping = false,
  onStop,
}: {
  title: string;
  messages: ChatMessage[];
  events: ChatEvent[];
  attachments: AttachmentStatus[];
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  onSend: (message: string, files: File[]) => Promise<void>;
  disabled?: boolean;
  isStreaming?: boolean;
  isBootstrapping?: boolean;
  onStop?: () => void;
}) {
  const [composerText, setComposerText] = useState("");

  return (
    <div className="bg-sidebar flex h-full min-h-[calc(100vh-5rem)] w-full overflow-hidden" data-testid="ai-engineer-shell">
      <main className="bg-background md:border-border/40 relative flex min-w-0 flex-1 flex-col overflow-hidden md:rounded-tl-xl md:border-t md:border-l">
        <AiEngineerHeader title={title} executionMode={executionMode} />
        <AiEngineerMessages
          messages={messages}
          events={events}
          isStreaming={isStreaming}
          isBootstrapping={isBootstrapping}
          onSuggestionSelect={setComposerText}
        />
        <div className="bg-background sticky bottom-0 z-10 mx-auto flex w-full max-w-4xl gap-2 px-2 pb-3 md:px-4 md:pb-4">
          <AiEngineerComposer
            input={composerText}
            onInputChange={setComposerText}
            disabled={disabled}
            executionMode={executionMode}
            onExecutionModeChange={onExecutionModeChange}
            onSend={onSend}
            isStreaming={isStreaming}
            onStop={onStop}
          />
        </div>
      </main>
      <aside className="border-border/40 bg-card/60 hidden w-[340px] shrink-0 border-l lg:flex">
        <AiEngineerActivityPanel events={events} attachments={attachments} />
      </aside>
    </div>
  );
}
