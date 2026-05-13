"use client";

import { Brain, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function KnowledgeHeader({ onUpload }: { onUpload: () => void }) {
  return (
    <header className="border-border/70 bg-background/95 border-b px-5 py-5 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg bg-[rgba(167,139,250,0.16)] text-[#a78bfa]">
            <Brain className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal">Knowledge</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
              Upload durable mission and vehicle knowledge that AI Engineer can retrieve across conversations.
            </p>
          </div>
        </div>
        <Button type="button" onClick={onUpload} data-testid="knowledge-upload-button">
          <Upload className="size-4" />
          Upload document
        </Button>
      </div>
    </header>
  );
}
