"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessageReasoning } from "@/applications/ai-engineer/types";
import { cn } from "@/lib/utils";

function labelForReasoning(reasoning: ChatMessageReasoning): string {
  if (reasoning.representation === "reasoning_summary") return "Reasoning summary";
  if (reasoning.representation === "thinking") return "Thinking";
  return "Reasoning";
}

export function AiEngineerReasoningPanel({ reasoning }: { reasoning: ChatMessageReasoning }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isStreaming = reasoning.status === "streaming";

  const updateIsAtBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsAtBottom(distanceFromBottom < 32);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !isStreaming || !isAtBottom) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
  }, [reasoning.content, isStreaming, isAtBottom, isExpanded]);

  if (reasoning.content.trim().length === 0) return null;

  return (
    <div className="border-border/40 bg-muted/30 w-[min(100%,720px)] overflow-hidden rounded-xl border shadow-[var(--shadow-card)]" data-testid="ai-engineer-reasoning-panel">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[11px] font-medium transition-colors"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isExpanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
          <span className="truncate">{labelForReasoning(reasoning)}</span>
        </span>
        {isStreaming ? <span className="shimmer-text shrink-0 text-[10px]">streaming</span> : null}
      </button>
      <div
        ref={scrollRef}
        className={cn(
          "text-muted-foreground/90 overflow-y-auto whitespace-pre-wrap px-3 pb-3 font-mono text-[11px] leading-[1.6]",
          isExpanded ? "max-h-72" : "max-h-24",
        )}
        onScroll={updateIsAtBottom}
      >
        {reasoning.content}
      </div>
    </div>
  );
}
