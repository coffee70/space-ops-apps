"use client";

import { AiEngineerMessage } from "@/applications/ai-engineer/components/ai-engineer-message";
import type { ChatMessage } from "@/applications/ai-engineer/types";

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  return <AiEngineerMessage message={message} />;
}
