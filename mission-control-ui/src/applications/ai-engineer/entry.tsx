import type { NativeApplicationEntry } from "@/platform/sdk/native-application-contract";
import { AiEngineerApp } from "@/applications/ai-engineer/components/ai-engineer-app";

export const applicationEntry: NativeApplicationEntry = {
  Component: AiEngineerApp,
};
