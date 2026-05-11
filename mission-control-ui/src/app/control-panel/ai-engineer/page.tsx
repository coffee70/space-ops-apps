"use client";

import { AiEngineerModelConfigEditorPanel } from "@/applications/control-panel/components/ai-engineer-model-config-editor-panel";
import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";

export default function AiEngineerModelConfigPage() {
  return (
    <ControlPanelShell activeTab="ai-engineer">
      <AiEngineerModelConfigEditorPanel />
    </ControlPanelShell>
  );
}
