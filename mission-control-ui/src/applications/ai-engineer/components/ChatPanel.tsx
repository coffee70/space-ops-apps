"use client";

import { useMemo, useState } from "react";

import type { AttachmentStatus, ChatMessage } from "@/applications/ai-engineer/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  attachments: AttachmentStatus[];
  onSend: (message: string, files: File[]) => Promise<void>;
}

export function ChatPanel({ messages, attachments, onSend }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const acceptHint = useMemo(() => "Attach mission/vehicle docs (md, txt, json, yaml, csv)", []);

  return (
    <section className="flex min-h-[560px] flex-col rounded-md border border-border bg-card p-3">
      <div className="mb-3 flex-1 space-y-2 overflow-auto text-sm">
        {messages.length === 0 ? <p className="text-muted-foreground">Start a conversation with the AI Engineer.</p> : null}
        {messages.map((message) => (
          <div key={message.id} className="rounded border border-border p-2">
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{message.role}</div>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>

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
          className="min-h-24 w-full rounded border border-border bg-background p-2 text-sm"
          placeholder="Describe the capability you want to create or inspect..."
        />
        <label className="block text-xs text-muted-foreground">
          {acceptHint}
          <input
            type="file"
            multiple
            className="mt-1 block w-full text-xs"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
        </label>
        {files.length > 0 ? (
          <div className="space-y-1 text-xs">
            {files.map((file) => (
              <div key={`${file.name}-${file.lastModified}`} className="rounded border border-border px-2 py-1">
                {file.name}
              </div>
            ))}
          </div>
        ) : null}
        {attachments.length > 0 ? <p className="text-xs text-muted-foreground">Uploaded: {attachments.length} document(s)</p> : null}
        <button
          type="submit"
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
