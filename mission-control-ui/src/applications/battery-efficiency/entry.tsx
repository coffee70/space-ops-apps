import { BatteryEfficiencyApplication } from "@/applications/battery-efficiency/page";
import type { NativeApplicationEntry } from "@/platform/sdk/native-application-contract";

export const applicationEntry: NativeApplicationEntry = {
  Component: BatteryEfficiencyApplication,
};
