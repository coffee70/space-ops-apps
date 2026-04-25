"use client";

import { usePlatformContextValue } from "@/platform/runtime/platform-context";

export function usePlatformContext() {
  return usePlatformContextValue();
}
