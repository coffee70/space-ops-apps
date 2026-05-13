"use client";

import { Brain, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function KnowledgeEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div
      data-testid="knowledge-empty-state"
      className="border-border/70 bg-card/60 flex min-h-[22rem] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center"
    >
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-lg">
        <Brain className="size-6" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">No knowledge documents yet</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        This library stores persistent mission documents, telemetry dictionaries, ICDs, procedures, and design notes for AI retrieval.
      </p>
      <Button type="button" className="mt-6" onClick={onUpload}>
        <Upload className="size-4" />
        Upload first document
      </Button>
    </div>
  );
}
