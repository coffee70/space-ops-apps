import type { NativeApplicationEntry } from "@/platform/sdk/native-application-contract";
import { AiEngineerApp } from "@/applications/ai-engineer/components/AiEngineerApp";

export const applicationEntry: NativeApplicationEntry = {
  Component: AiEngineerApp,
};
