import { AiEngineerModelConfigEditorPanel } from "@/applications/control-panel/components/ai-engineer-model-config-editor-panel";
import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";
import { SourcesControlPanelSection } from "@/applications/control-panel/components/sources-control-panel-section";
import { SimulatorManagePageClient } from "@/app/sources/simulator/[sourceId]/simulator-manage-page-client";
import { VehicleConfigsPage } from "@/app/sources/configs/page";
import { SourcesPage } from "@/app/sources/page";
import type { NativeApplicationEntry, NativeApplicationProps } from "@/platform/sdk/native-application-contract";

function SourcesApplication({ appPath }: NativeApplicationProps) {
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

  if (appPath[0] === "sources") {
    return (
      <ControlPanelShell activeTab="sources">
        <SourcesControlPanelSection />
      </ControlPanelShell>
    );
  }

  return <SourcesPage />;
}

export const applicationEntry: NativeApplicationEntry = {
  Component: SourcesApplication,
};
