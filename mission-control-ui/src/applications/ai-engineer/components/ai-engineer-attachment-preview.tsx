"use client";

import { FileText, X } from "lucide-react";

import { formatFileSize } from "@/applications/ai-engineer/lib/file-formatting";

export function AiEngineerAttachmentPreview({
  file,
  isUploading = false,
  onRemove,
}: {
  file: File;
  isUploading?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div
      className="group border-border/40 bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border shadow-[var(--shadow-card)]"
      data-testid="ai-engineer-attachment-preview"
    >
      <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1 px-2 text-center">
        <FileText className="size-5" />
        <span className="max-w-full truncate text-[10px]">{file.name}</span>
        <span className="text-muted-foreground/70 text-[9px]">{formatFileSize(file.size)}</span>
      </div>
      {isUploading ? <div className="bg-background/60 shimmer absolute inset-0" aria-hidden="true" /> : null}
      {onRemove && !isUploading ? (
        <button
          type="button"
          className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/80"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
