"use client";

import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";
import { DeploymentsControlPanelSection } from "@/applications/control-panel/components/deployments-control-panel-section";

export default function DeploymentsPage() {
  return (
    <ControlPanelShell activeTab="deployments">
      <DeploymentsControlPanelSection />
    </ControlPanelShell>
  );
}
