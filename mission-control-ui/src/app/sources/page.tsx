"use client";

import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";
import { SourcesControlPanelSection } from "@/applications/control-panel/components/sources-control-panel-section";

export function SourcesPage() {
  return (
    <ControlPanelShell activeTab="sources">
      <SourcesControlPanelSection />
    </ControlPanelShell>
  );
}

export default SourcesPage;
