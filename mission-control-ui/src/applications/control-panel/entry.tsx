import { AiEngineerModelConfigEditorPanel } from "@/applications/control-panel/components/ai-engineer-model-config-editor-panel";
import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";
import { DeploymentsControlPanelSection } from "@/applications/control-panel/components/deployments-control-panel-section";
import { SourcesControlPanelSection } from "@/applications/control-panel/components/sources-control-panel-section";
import { SimulatorManagePageClient } from "@/app/control-panel/simulator/[sourceId]/simulator-manage-page-client";
import { VehicleConfigsPage } from "@/app/control-panel/configs/page";
import type { NativeApplicationEntry, NativeApplicationProps } from "@/platform/sdk/native-application-contract";

function ControlPanelApplication({ appPath }: NativeApplicationProps) {
  if (appPath[0] === "configs") {
    return <VehicleConfigsPage />;
  }

  if (appPath[0] === "simulator" && appPath[1]) {
    return <SimulatorManagePageClient sourceId={appPath[1]} />;
  }

  if (appPath[0] === "ai-engineer") {
    return (
      <ControlPanelShell activeTab="ai-engineer">
        <AiEngineerModelConfigEditorPanel />
      </ControlPanelShell>
    );
  }

  if (appPath[0] === "deployments") {
    return (
      <ControlPanelShell activeTab="deployments">
        <DeploymentsControlPanelSection />
      </ControlPanelShell>
    );
  }

  return (
    <ControlPanelShell activeTab="sources">
      <SourcesControlPanelSection />
    </ControlPanelShell>
  );
}

export const applicationEntry: NativeApplicationEntry = {
  Component: ControlPanelApplication,
};
