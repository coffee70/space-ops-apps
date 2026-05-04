"use client";

import { AiEngineerComposer } from "@/applications/ai-engineer/components/ai-engineer-composer";
import type { ExecutionMode } from "@/applications/ai-engineer/types";

interface ChatComposerProps {
  uploadedCount: number;
  onSend: (message: string, files: File[]) => Promise<void>;
  onFilesSelected?: (files: File[]) => Promise<void>;
  executionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

export function ChatComposer({ uploadedCount, onSend, onFilesSelected, executionMode, onExecutionModeChange, disabled = false }: ChatComposerProps) {
  void uploadedCount;
  void onFilesSelected;
  return <AiEngineerComposer onSend={onSend} executionMode={executionMode} onExecutionModeChange={onExecutionModeChange} disabled={disabled} />;
}
