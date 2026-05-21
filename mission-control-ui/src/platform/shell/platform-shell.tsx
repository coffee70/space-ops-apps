"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SideNav } from "@/platform/shell/side-nav";
import { PlatformContextProvider } from "@/platform/runtime/platform-context";
import { extractCurrentApplicationId } from "@/platform/registry/application-routes";
import { PreviewRuntimeBanner } from "@/platform/shell/preview-runtime-banner";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeApplicationId = extractCurrentApplicationId(pathname);
  const value = useMemo(
    () => ({
      activeApplicationId,
      openApplication: (routePath: string) => router.push(routePath),
      switchApplication: (routePath: string) => router.push(routePath),
    }),
    [activeApplicationId, router],
  );

  return (
    <PlatformContextProvider value={value}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SideNav />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:pt-0"
        >
          <PreviewRuntimeBanner />
          {children}
        </main>
      </div>
    </PlatformContextProvider>
  );
}
