"use client";

import { createContext, useContext } from "react";

export interface PlatformContextValue {
  activeApplicationId: string | null;
  openApplication: (routePath: string) => void;
  switchApplication: (routePath: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PlatformContextValue;
}) {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatformContextValue() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error("usePlatformContextValue must be used within PlatformContextProvider");
  }
  return context;
}
