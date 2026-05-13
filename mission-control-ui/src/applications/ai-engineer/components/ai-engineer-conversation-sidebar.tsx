"use client";

import { Plus } from "lucide-react";

import type { AiEngineerConversationSummary } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getConversationTitle(conversation: AiEngineerConversationSummary) {
  return conversation.title?.trim() || "Untitled chat";
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return formatter.format(date);
}

export function AiEngineerConversationSidebar({
  conversations,
  activeConversationId,
  isLoading,
  error,
  disabled = false,
  onNewChat,
  onSelectConversation,
}: {
  conversations: AiEngineerConversationSummary[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <section className="bg-background text-foreground flex h-full w-full flex-col" aria-label="AI Engineer conversations" data-testid="ai-engineer-conversation-sidebar">
      <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-3">
        <h2 className="text-sm font-medium">Chats</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        <Button
          type="button"
          className="w-full shadow-xs"
          onClick={onNewChat}
          disabled={disabled}
          data-testid="ai-engineer-new-chat-button"
        >
          <Plus className="size-4" aria-hidden />
          New Chat
        </Button>
        <div className="text-muted-foreground px-1 text-[11px] font-medium tracking-[0.08em] uppercase">Recent Conversations</div>
        {isLoading ? (
          <div className="text-muted-foreground rounded-md px-2 py-3 text-sm" data-testid="ai-engineer-conversation-list-loading">
            Loading chats...
          </div>
        ) : null}
        {!isLoading && error ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm" data-testid="ai-engineer-conversation-list-error">
            {error}
          </div>
        ) : null}
        {!isLoading && !error && conversations.length === 0 ? (
          <div className="text-muted-foreground rounded-md px-2 py-3 text-sm" data-testid="ai-engineer-conversation-list-empty">
            <p>No recent chats yet.</p>
            <p>Start a new chat to begin.</p>
          </div>
        ) : null}
        {!isLoading && !error && conversations.length > 0 ? (
          <div className="flex flex-col gap-1" data-testid="ai-engineer-conversation-list">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const formattedTime = formatConversationTime(conversation.updated_at || conversation.created_at);
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md border border-transparent px-2.5 py-2 text-left shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    isActive
                      ? "border-border bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                  disabled={disabled}
                  aria-current={isActive ? "page" : undefined}
                  data-testid="ai-engineer-conversation-row"
                  data-active={isActive ? "true" : "false"}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{getConversationTitle(conversation)}</span>
                    {formattedTime ? <span className="text-muted-foreground block text-xs">{formattedTime}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
