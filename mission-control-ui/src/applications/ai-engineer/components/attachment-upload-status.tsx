"use client";

import { AiEngineerActivityPanel } from "@/applications/ai-engineer/components/ai-engineer-activity-panel";
import type { AttachmentStatus } from "@/applications/ai-engineer/types";

export function AttachmentUploadStatus({ attachments }: { attachments: AttachmentStatus[] }) {
  return <AiEngineerActivityPanel events={[]} attachments={attachments} />;
}
