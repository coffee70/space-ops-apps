"use client";

import type { AttachmentStatus } from "@/applications/ai-engineer/types";

export function AttachmentUploadStatus({ attachments }: { attachments: AttachmentStatus[] }) {
  const displayStatus = (status: AttachmentStatus["status"]) => {
    if (status === "uploading") return "ingesting";
    if (status === "ready") return "ready";
    return "failed";
  };

  return (
    <section className="border-border bg-card rounded-md border p-3">
      <h3 className="mb-2 text-sm font-semibold">Attachments</h3>
      <div className="space-y-2 text-xs">
        {attachments.length === 0 ? <p className="text-muted-foreground">No attachments uploaded.</p> : null}
        {attachments.map((attachment) => (
          <div key={`${attachment.fileName}-${attachment.documentId ?? attachment.status}`} className="border-border rounded border px-2 py-1">
            <div className="flex items-center justify-between">
              <span className="truncate">{attachment.fileName}</span>
              <span className="text-muted-foreground">{displayStatus(attachment.status)}</span>
            </div>
            {attachment.status === "ready" && !attachment.documentId ? (
              <p className="text-muted-foreground mt-1 break-words">metadata incomplete: missing document id</p>
            ) : null}
            {attachment.message ? <p className="text-muted-foreground mt-1 break-words">{attachment.message}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
