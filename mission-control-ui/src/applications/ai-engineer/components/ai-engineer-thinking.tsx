"use client";

import { Sparkles } from "lucide-react";

export function AiEngineerThinking() {
  return (
    <div className="group/message fade-up w-full" data-role="assistant" data-testid="ai-engineer-message-assistant-loading">
      <div className="flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="bg-muted/60 text-muted-foreground ring-border/50 flex size-7 items-center justify-center rounded-lg ring-1">
            <Sparkles className="size-3.5" />
          </div>
        </div>
        <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
          <span className="shimmer-text font-medium">Thinking...</span>
        </div>
      </div>
    </div>
  );
}
