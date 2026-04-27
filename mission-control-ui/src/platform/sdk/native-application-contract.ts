import type { ComponentType, ReactElement } from "react";
import type { PlatformApplicationDefinition } from "@/platform/registry/application-types";

export interface PlatformContextSnapshot {
  activeApplicationId: string;
}

export interface NativeApplicationProps {
  application: PlatformApplicationDefinition;
  appPath: string[];
  searchParams: Record<string, string | string[] | undefined>;
  platform: PlatformContextSnapshot;
}

export interface NativeApplicationEntry {
  Component: ComponentType<NativeApplicationProps> | ((props: NativeApplicationProps) => Promise<ReactElement>);
}
