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

  return <SourcesPage />;
}

export const applicationEntry: NativeApplicationEntry = {
  Component: SourcesApplication,
};
