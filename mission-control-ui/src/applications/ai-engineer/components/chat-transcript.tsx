"use client";

import { AiEngineerMessages } from "@/applications/ai-engineer/components/ai-engineer-messages";
import type { ChatMessage } from "@/applications/ai-engineer/types";

export function ChatTranscript({ messages }: { messages: ChatMessage[] }) {
  return <AiEngineerMessages messages={messages} events={[]} />;
}
