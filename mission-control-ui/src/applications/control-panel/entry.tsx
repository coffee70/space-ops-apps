import { AiEngineerModelConfigEditorPanel } from "@/applications/control-panel/components/ai-engineer-model-config-editor-panel";
import { CodeRepositoryControlPanelSection } from "@/applications/control-panel/components/code-repository-control-panel-section";
import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";
import { DeploymentsControlPanelSection } from "@/applications/control-panel/components/deployments-control-panel-section";
import { SourcesControlPanelSection } from "@/applications/control-panel/components/sources-control-panel-section";
import { SimulatorManagePageClient } from "@/app/control-panel/simulator/[sourceId]/simulator-manage-page-client";
import { VehicleConfigsPage } from "@/app/control-panel/configs/page";
import type { NativeApplicationEntry, NativeApplicationProps } from "@/platform/sdk/native-application-contract";

export function getControlPanelRoute(appPath: string[]) {
  if (appPath[0] === "configs") return "configs";
  if (appPath[0] === "simulator" && appPath[1]) return "simulator";
  if (appPath[0] === "ai-engineer") return "ai-engineer";
  if (appPath[0] === "deployments") return "deployments";
  if (appPath[0] === "code-repository") return "code-repository";
  return "sources";
}

function ControlPanelApplication({ appPath }: NativeApplicationProps) {
  const route = getControlPanelRoute(appPath);

  if (route === "configs") {
    return <VehicleConfigsPage />;
  }

  if (route === "simulator" && appPath[1]) {
    return <SimulatorManagePageClient sourceId={appPath[1]} />;
  }

  if (route === "ai-engineer") {
    return (
      <ControlPanelShell activeTab="ai-engineer">
        <AiEngineerModelConfigEditorPanel />
      </ControlPanelShell>
    );
  }

  if (route === "deployments") {
    return (
      <ControlPanelShell activeTab="deployments">
        <DeploymentsControlPanelSection />
      </ControlPanelShell>
    );
  }

  if (route === "code-repository") {
    return (
      <ControlPanelShell activeTab="code-repository">
        <CodeRepositoryControlPanelSection />
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
