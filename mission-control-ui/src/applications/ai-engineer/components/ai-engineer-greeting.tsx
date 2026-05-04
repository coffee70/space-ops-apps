"use client";

import { Sparkles } from "lucide-react";

export function AiEngineerGreeting({ isBootstrapping = false }: { isBootstrapping?: boolean }) {
  const suggestions = [
    "Where is the application registry implemented?",
    "List available platform tools",
    "Search uploaded mission docs",
    "Open the telemetry app",
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
      <div className="bg-muted/70 text-muted-foreground ring-border/50 mb-5 flex size-10 items-center justify-center rounded-2xl ring-1">
        <Sparkles className="size-5" />
      </div>
      <h2 className="text-xl font-semibold tracking-normal">What should we inspect or build?</h2>
      <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
        {isBootstrapping
          ? "Preparing the AI Engineer session..."
          : "Ask about platform services, code locations, mission documents, telemetry, or controlled capability changes."}
      </p>
      <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <span key={suggestion} className="border-border/50 bg-card/70 text-muted-foreground rounded-full border px-3 py-1.5 text-[11px] shadow-[var(--shadow-card)]">
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
}
