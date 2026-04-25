import { PlanningEarthPage } from "@/components/planning-earth-page";
import type { NativeApplicationEntry } from "@/platform/sdk/native-application-contract";

function PlanningApplication() {
  return <PlanningEarthPage />;
}

export const applicationEntry: NativeApplicationEntry = {
  Component: PlanningApplication,
};
