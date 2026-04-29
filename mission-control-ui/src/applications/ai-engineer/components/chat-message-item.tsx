"use client";

import type { ChatMessage } from "@/applications/ai-engineer/types";

const ROLE_LABEL: Record<ChatMessage["role"], string> = {
  user: "User",
  assistant: "Assistant",
  tool: "Tool",
};

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  return (
    <div className="border-border rounded border p-2">
      <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">{ROLE_LABEL[message.role]}</div>
      <p className="whitespace-pre-wrap">{message.content || (message.status === "streaming" ? "Thinking..." : "")}</p>
    </div>
  );
}
