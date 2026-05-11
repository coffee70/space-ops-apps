"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buildApplicationRoute } from "@/platform/registry/application-routes";

export type ControlPanelTabId = "sources" | "ai-engineer";

type ControlPanelShellProps = {
  activeTab: ControlPanelTabId;
  children: ReactNode;
};

const TABS: { id: ControlPanelTabId; label: string; href: string; testId: string }[] = [
  { id: "sources", label: "Sources", href: buildApplicationRoute("sources"), testId: "control-panel-tab-sources" },
  {
    id: "ai-engineer",
    label: "AI Engineer",
    href: buildApplicationRoute("sources", ["ai-engineer"]),
    testId: "control-panel-tab-ai-engineer",
  },
];

export function ControlPanelShell({ activeTab, children }: ControlPanelShellProps) {
  return (
    <div
      className="flex min-h-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8"
      data-testid="control-panel-shell"
    >
      <div className="lg:border-border flex shrink-0 flex-col gap-2 lg:w-52 lg:border-r lg:pr-6">
        <div className="mb-2">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Control Panel</h1>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            Telemetry sources, vehicle configs, and AI Engineer model registry.
          </p>
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
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
