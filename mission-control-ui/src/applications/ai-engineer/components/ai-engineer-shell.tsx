"use client";

import { useState } from "react";

import { AiEngineerActivityPanel } from "@/applications/ai-engineer/components/ai-engineer-activity-panel";
import { AiEngineerComposer } from "@/applications/ai-engineer/components/ai-engineer-composer";
import { AiEngineerConversationSidebar } from "@/applications/ai-engineer/components/ai-engineer-conversation-sidebar";
import { AiEngineerHeader } from "@/applications/ai-engineer/components/ai-engineer-header";
import { AiEngineerMessages } from "@/applications/ai-engineer/components/ai-engineer-messages";
import type { AiEngineerChangeSummary, ChangePreviewState } from "@/applications/ai-engineer/lib/change-preview-types";
import type { AiEngineerConversationSummary, AiEngineerModelOption, AttachmentStatus, ChatEvent, ChatMessage, ExecutionMode } from "@/applications/ai-engineer/types";
import type { FrontendRuntimeStatus } from "@/lib/ui-boundary-schemas";

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
  models,
  selectedModelId,
  onModelSelect,
  isLoadingModels = false,
  modelLoadError,
  selectedModelName,
  conversations,
  activeConversationId,
  isLoadingConversations = false,
  conversationListError,
  onNewChat,
  onSelectConversation,
  runtimeStatus,
  previewStates,
  isBusyForChange,
  onDeployChange,
  onRevertChange,
  onOpenPreviewApp,
}: {
  title: string;
  messages: ChatMessage[];
  events: ChatEvent[];
  attachments: AttachmentStatus[];
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  isStreaming?: boolean;
  isBootstrapping?: boolean;
  onStop?: () => void;
  models?: AiEngineerModelOption[];
  selectedModelId?: string | null;
  onModelSelect?: (modelId: string) => void;
  isLoadingModels?: boolean;
  modelLoadError?: string | null;
  selectedModelName?: string | null;
  conversations?: AiEngineerConversationSummary[];
  activeConversationId?: string | null;
  isLoadingConversations?: boolean;
  conversationListError?: string | null;
  onNewChat?: () => void;
  onSelectConversation?: (conversationId: string) => void;
  runtimeStatus?: FrontendRuntimeStatus | null;
  previewStates?: ChangePreviewState[];
  isBusyForChange?: (change: AiEngineerChangeSummary) => boolean;
  onDeployChange?: (change: AiEngineerChangeSummary) => void;
  onRevertChange?: (change: AiEngineerChangeSummary) => void;
  onOpenPreviewApp?: (change: AiEngineerChangeSummary) => void;
}) {
  const [composerState, setComposerState] = useState<{ conversationId: string | null; text: string }>({ conversationId: null, text: "" });
  const composerText = composerState.conversationId === (activeConversationId ?? null) ? composerState.text : "";
  const setComposerText = (text: string) => {
    setComposerState({ conversationId: activeConversationId ?? null, text });
  };

  return (
    <div className="bg-background text-foreground flex h-full min-h-0 w-full overflow-hidden" data-testid="ai-engineer-shell">
      <aside className="border-border bg-background hidden min-h-0 w-[280px] shrink-0 overflow-hidden border-r md:flex">
        <AiEngineerConversationSidebar
          conversations={conversations ?? []}
          activeConversationId={activeConversationId ?? null}
          isLoading={isLoadingConversations}
          error={conversationListError ?? null}
          disabled={disabled || isStreaming}
          onNewChat={onNewChat ?? (() => {})}
          onSelectConversation={onSelectConversation ?? (() => {})}
        />
      </aside>
      <main className="bg-background md:border-border relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:border-t">
        <AiEngineerHeader
          title={title}
          executionMode={executionMode}
          selectedModelName={selectedModelName}
          runtimeStatus={runtimeStatus}
        />
        <AiEngineerMessages
          messages={messages}
          events={events}
          isStreaming={isStreaming}
          isBootstrapping={isBootstrapping}
          onSuggestionSelect={setComposerText}
          previewStates={previewStates}
          isBusyForChange={isBusyForChange}
          onDeployChange={onDeployChange}
          onRevertChange={onRevertChange}
          onOpenPreviewApp={onOpenPreviewApp}
        />
        <div className="bg-background z-10 mx-auto flex w-full max-w-4xl shrink-0 gap-2 px-2 pb-3 md:px-4 md:pb-4">
          <AiEngineerComposer
            input={composerText}
            onInputChange={setComposerText}
            disabled={disabled}
            executionMode={executionMode}
            onExecutionModeChange={onExecutionModeChange}
            onSend={onSend}
            isStreaming={isStreaming}
            onStop={onStop}
            models={models ?? []}
            selectedModelId={selectedModelId ?? null}
            onModelSelect={onModelSelect}
            isLoadingModels={isLoadingModels}
            modelLoadError={modelLoadError ?? null}
          />
        </div>
      </main>
      <aside className="border-border bg-background hidden min-h-0 w-[340px] shrink-0 overflow-hidden border-l lg:flex">
        <AiEngineerActivityPanel events={events} attachments={attachments} />
      </aside>
    </div>
  );
}
