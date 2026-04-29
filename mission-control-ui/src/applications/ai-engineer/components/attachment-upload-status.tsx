"use client";

import type { AttachmentStatus } from "@/applications/ai-engineer/types";

export function AttachmentUploadStatus({ attachments }: { attachments: AttachmentStatus[] }) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold">Attachments</h3>
      <div className="space-y-2 text-xs">
        {attachments.length === 0 ? <p className="text-muted-foreground">No attachments uploaded.</p> : null}
        {attachments.map((attachment) => (
          <div key={`${attachment.fileName}-${attachment.documentId ?? "pending"}`} className="flex items-center justify-between rounded border border-border px-2 py-1">
            <span className="truncate">{attachment.fileName}</span>
            <span className="text-muted-foreground">{attachment.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
