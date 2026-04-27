import { OverviewContent } from "@/components/overview-content";
import type { NativeApplicationEntry } from "@/platform/sdk/native-application-contract";

function OverviewApplication() {
  return <OverviewContent />;
}

export const applicationEntry: NativeApplicationEntry = {
  Component: OverviewApplication,
};
