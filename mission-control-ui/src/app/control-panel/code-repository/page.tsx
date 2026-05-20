"use client";

import { CodeRepositoryControlPanelSection } from "@/applications/control-panel/components/code-repository-control-panel-section";
import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";

export default function CodeRepositoryPage() {
  return (
    <ControlPanelShell activeTab="code-repository">
      <CodeRepositoryControlPanelSection />
    </ControlPanelShell>
  );
}
