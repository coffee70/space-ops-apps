import { SimulatorManagePageClient } from "./simulator-manage-page-client";

export default async function SimulatorManageRoutePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  return <SimulatorManagePageClient sourceId={sourceId} />;
}
