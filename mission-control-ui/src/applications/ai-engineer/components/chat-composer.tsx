"use client";

import { useState } from "react";

import { AiEngineerComposer } from "@/applications/ai-engineer/components/ai-engineer-composer";
import type { ExecutionMode } from "@/applications/ai-engineer/types";

interface ChatComposerProps {
  uploadedCount: number;
  onSend: (message: string) => Promise<void>;
  onFilesSelected?: (files: File[]) => Promise<void>;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

export function ChatComposer({ uploadedCount, onSend, onFilesSelected, executionMode, onExecutionModeChange, disabled = false }: ChatComposerProps) {
  const [input, setInput] = useState("");

  void uploadedCount;
  void onFilesSelected;
  return (
    <AiEngineerComposer
      input={input}
      onInputChange={setInput}
      onSend={onSend}
      executionMode={executionMode}
      onExecutionModeChange={onExecutionModeChange}
      disabled={disabled}
    />
  );
}
