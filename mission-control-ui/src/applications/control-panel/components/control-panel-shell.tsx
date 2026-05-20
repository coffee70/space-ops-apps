"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buildApplicationRoute } from "@/platform/registry/application-routes";

export type ControlPanelTabId = "sources" | "deployments" | "ai-engineer" | "code-repository";

type ControlPanelShellProps = {
  activeTab: ControlPanelTabId;
  children: ReactNode;
};

const TABS: { id: ControlPanelTabId; label: string; href: string; testId: string }[] = [
  { id: "sources", label: "Sources", href: buildApplicationRoute("control-panel"), testId: "control-panel-tab-sources" },
  {
    id: "deployments",
    label: "Deployments",
    href: buildApplicationRoute("control-panel", ["deployments"]),
    testId: "control-panel-tab-deployments",
  },
  {
    id: "ai-engineer",
    label: "AI Engineer",
    href: buildApplicationRoute("control-panel", ["ai-engineer"]),
    testId: "control-panel-tab-ai-engineer",
  },
  {
    id: "code-repository",
    label: "Code Repository",
    href: buildApplicationRoute("control-panel", ["code-repository"]),
    testId: "control-panel-tab-code-repository",
  },
];

export function ControlPanelShell({ activeTab, children }: ControlPanelShellProps) {
  return (
    <div
      className="grid h-[calc(100dvh-3.5rem)] w-full flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden p-2 sm:p-4 md:h-dvh lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:grid-rows-1 lg:gap-6"
      data-testid="control-panel-shell"
    >
      <aside className="border-border/70 bg-card/70 flex min-w-0 flex-col gap-3 rounded-2xl border p-3 shadow-xs backdrop-blur lg:h-full lg:min-h-0">
        <div className="px-1 pt-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Control Panel</h1>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
          aria-label="Control Panel sections"
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                data-testid={tab.testId}
                className={cn(
                  "rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors lg:w-full",
                  selected
                    ? "border-border/80 bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-0 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
