"use client";

import { ChatMessageItem } from "@/applications/ai-engineer/components/chat-message-item";
import type { ChatMessage } from "@/applications/ai-engineer/types";

export function ChatTranscript({ messages }: { messages: ChatMessage[] }) {
  return (
    <div
      className="mb-3 flex-1 space-y-2 overflow-auto text-sm"
      data-testid="ai-engineer-chat-transcript"
    >
      {messages.length === 0 ? <p className="text-muted-foreground">Start a conversation with the AI Engineer.</p> : null}
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
