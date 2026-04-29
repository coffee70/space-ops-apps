"use client";

import { useState } from "react";

import { AttachmentPicker } from "@/applications/ai-engineer/components/attachment-picker";
import { AttachmentPreview } from "@/applications/ai-engineer/components/attachment-preview";
import type { ExecutionMode } from "@/applications/ai-engineer/types";

interface ChatComposerProps {
  uploadedCount: number;
  onSend: (message: string, files: File[]) => Promise<void>;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
}

export function ChatComposer({ uploadedCount, onSend, executionMode, onExecutionModeChange }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!text.trim() && files.length === 0) return;
        setIsSending(true);
        try {
          await onSend(text, files);
          setText("");
          setFiles([]);
        } finally {
          setIsSending(false);
        }
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="border-border bg-background min-h-24 w-full rounded border p-2 text-sm"
        placeholder="Describe the capability you want to create or inspect..."
      />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="execution-mode" className="text-muted-foreground text-xs">
          Mode
        </label>
        <select
          id="execution-mode"
          className="border-border bg-background rounded border px-2 py-1 text-xs"
          value={executionMode}
          onChange={(event) => onExecutionModeChange(event.target.value as ExecutionMode)}
        >
          <option value="read_only">Read-only</option>
          <option value="suggest">Suggest</option>
          <option value="execute">Execute</option>
        </select>
      </div>
      <AttachmentPicker onSelect={setFiles} />
      <AttachmentPreview
        files={files}
        onRemove={(index) => {
          setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
        }}
      />
      {uploadedCount > 0 ? <p className="text-muted-foreground text-xs">Uploaded: {uploadedCount} document(s)</p> : null}
      <button
        type="submit"
        className="bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm disabled:opacity-50"
        disabled={isSending}
      >
        {isSending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
