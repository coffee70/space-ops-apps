import type { NativeApplicationEntry } from "@/platform/sdk/native-application-contract";
import { KnowledgeApp } from "@/applications/knowledge/components/knowledge-app";

export const applicationEntry: NativeApplicationEntry = {
  Component: KnowledgeApp,
};
