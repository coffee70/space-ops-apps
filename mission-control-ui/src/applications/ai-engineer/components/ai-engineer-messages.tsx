"use client";

import { ArrowDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AiEngineerGreeting } from "@/applications/ai-engineer/components/ai-engineer-greeting";
import { AiEngineerMessage } from "@/applications/ai-engineer/components/ai-engineer-message";
import { AiEngineerThinking } from "@/applications/ai-engineer/components/ai-engineer-thinking";
import type { ChatEvent, ChatMessage } from "@/applications/ai-engineer/types";
import { cn } from "@/lib/utils";

export function AiEngineerMessages({
  messages,
  events,
  isStreaming = false,
  isBootstrapping = false,
  onSuggestionSelect,
}: {
  messages: ChatMessage[];
  events: ChatEvent[];
  isStreaming?: boolean;
  isBootstrapping?: boolean;
  onSuggestionSelect?: (suggestion: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsAtBottom(distanceFromBottom < 96);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(isStreaming ? "auto" : "smooth");
    }
  }, [isAtBottom, isStreaming, messages, events, scrollToBottom]);

  const shouldShowThinking = isStreaming && messages.at(-1)?.role !== "assistant";

  return (
    <div className="bg-background relative min-h-0 flex-1 overflow-hidden" data-testid="ai-engineer-messages">
      {messages.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto">
            <AiEngineerGreeting isBootstrapping={isBootstrapping} onSuggestionSelect={onSuggestionSelect} />
          </div>
        </div>
      ) : null}
      <div ref={scrollRef} className="absolute inset-0 touch-pan-y overflow-y-auto" onScroll={handleScroll} data-testid="ai-engineer-chat-transcript">
        <div className="mx-auto flex min-h-full max-w-4xl min-w-0 flex-col gap-5 px-2 py-6 md:gap-7 md:px-4">
          {messages.map((message) => (
            <AiEngineerMessage key={message.id} message={message} events={events} />
          ))}
          {shouldShowThinking ? <AiEngineerThinking /> : null}
          <div ref={endRef} className="min-h-6 min-w-6 shrink-0" />
        </div>
      </div>
      <button
        type="button"
        aria-label="Scroll to bottom"
        className={cn(
          "absolute bottom-4 left-1/2 z-20 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground shadow-[var(--shadow-float)] transition-all",
          isAtBottom ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100 hover:text-foreground",
        )}
        onClick={() => scrollToBottom("smooth")}
      >
        <ArrowDown className="size-3.5" />
      </button>
    </div>
  );
}
