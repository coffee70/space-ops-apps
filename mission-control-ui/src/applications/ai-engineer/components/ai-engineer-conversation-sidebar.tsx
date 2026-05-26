"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

import type { AiEngineerConversationSummary } from "@/applications/ai-engineer/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onRenameConversation = () => {},
}: {
  conversations: AiEngineerConversationSummary[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation?: (conversationId: string, title: string) => void;
}) {
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const showLoading = isLoading && conversations.length === 0;
  const showError = Boolean(error) && conversations.length === 0;
  const showEmpty = !showLoading && !showError && conversations.length === 0;
  const showRows = conversations.length > 0;

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
        {showLoading ? (
          <div className="text-muted-foreground rounded-md px-2 py-3 text-sm" data-testid="ai-engineer-conversation-list-loading">
            Loading chats...
          </div>
        ) : null}
        {showError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm" data-testid="ai-engineer-conversation-list-error">
            {error}
          </div>
        ) : null}
        {showEmpty ? (
          <div className="text-muted-foreground rounded-md px-2 py-3 text-sm" data-testid="ai-engineer-conversation-list-empty">
            <p>No recent chats yet.</p>
            <p>Start a new chat to begin.</p>
          </div>
        ) : null}
        {showRows ? (
          <div className="flex flex-col gap-1" data-testid="ai-engineer-conversation-list">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const formattedTime = formatConversationTime(conversation.updated_at || conversation.created_at);
              const isEditing = editing?.id === conversation.id;
              const saveEdit = () => {
                if (disabled) {
                  setEditing(null);
                  return;
                }
                const nextTitle = editing?.title.trim();
                if (nextTitle) onRenameConversation(conversation.id, nextTitle);
                setEditing(null);
              };
              const startRename = () => {
                if (disabled) return;
                setEditing({ id: conversation.id, title: getConversationTitle(conversation) });
              };
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md border border-transparent px-2.5 py-2 text-left shadow-xs transition-colors",
                    disabled && "cursor-not-allowed opacity-60",
                    isActive
                      ? "border-border bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => {
                    if (!disabled && !isEditing) onSelectConversation(conversation.id);
                  }}
                  onKeyDown={(event) => {
                    if (!disabled && !isEditing && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onSelectConversation(conversation.id);
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={disabled}
                  data-testid="ai-engineer-conversation-row"
                  data-active={isActive ? "true" : "false"}
                >
                  <span className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        className="bg-background text-foreground ring-ring block w-full rounded-sm px-1 text-sm font-medium ring-1"
                        value={editing.title}
                        autoFocus
                        disabled={disabled}
                        onChange={(event) => {
                          if (!disabled) setEditing({ id: conversation.id, title: event.target.value });
                        }}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={saveEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEdit();
                          if (event.key === "Escape") {
                            event.stopPropagation();
                            setEditing(null);
                          }
                        }}
                      />
                    ) : (
                      <span className="block truncate text-sm font-medium">{getConversationTitle(conversation)}</span>
                    )}
                    {formattedTime ? <span className="text-muted-foreground block text-xs">{formattedTime}</span> : null}
                  </span>
                  {!isEditing && !disabled ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          title="Conversation actions"
                          aria-label={`Actions for ${getConversationTitle(conversation)}`}
                          className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-32"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            startRename();
                          }}
                        >
                          Change name
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
