"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buildApplicationRoute } from "@/platform/registry/application-routes";

export type ControlPanelTabId = "sources" | "deployments" | "ai-engineer";

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
];

export function ControlPanelShell({ activeTab, children }: ControlPanelShellProps) {
  return (
    <div
      className="mx-auto grid min-h-full w-full max-w-[96rem] flex-1 grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-6 lg:p-8"
      data-testid="control-panel-shell"
    >
      <aside className="border-border/70 bg-card/70 flex min-w-0 flex-col gap-3 rounded-2xl border p-3 shadow-xs backdrop-blur">
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
                  "border border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors lg:w-full",
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
      <main className="min-h-0 min-w-0">{children}</main>
    </div>
  );
}
