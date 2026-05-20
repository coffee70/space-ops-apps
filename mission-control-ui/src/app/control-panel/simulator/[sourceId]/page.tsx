import { ControlPanelShell } from "@/applications/control-panel/components/control-panel-shell";
import { SimulatorManagePageClient } from "./simulator-manage-page-client";

export default async function SimulatorManageRoutePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  return (
    <ControlPanelShell activeTab="sources">
      <SimulatorManagePageClient sourceId={sourceId} />
    </ControlPanelShell>
  );
}
