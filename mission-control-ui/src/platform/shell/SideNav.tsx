"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Grid2x2,
  Keyboard,
  Menu,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { OperatorModeToggle } from "@/components/operator-mode-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchPlatformApplications } from "@/platform/registry/application-registry-client";
import {
  extractCurrentApplicationId,
} from "@/platform/registry/application-routes";
import type { PlatformApplicationDefinition } from "@/platform/registry/application-types";
import { ApplicationsLauncher } from "@/platform/shell/ApplicationsLauncher";
import { resolveApplicationIcon } from "@/platform/shell/application-icons";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED_W = "md:w-56";
const SIDEBAR_COLLAPSED_W = "md:w-[56px]";
const ITEM_ROW =
  "flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg px-2.5 text-sm font-medium";

function NavRow({
  expanded,
  active,
  label,
  icon,
  onClick,
  href,
  testId,
}: {
  expanded: boolean;
  active?: boolean;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  testId?: string;
}) {
  const className = cn(
    ITEM_ROW,
    "transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
    active
      ? "bg-accent text-foreground"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
  );

  const content = (
    <>
      <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 overflow-hidden whitespace-nowrap">{label}</span>
    </>
  );

  const inner = href ? (
    <Link href={href} className={className} title={!expanded ? label : undefined} data-testid={testId}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={!expanded ? label : undefined}
      data-testid={testId}
    >
      {content}
    </button>
  );

  if (expanded) return inner;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const applicationsQuery = useQuery({
    queryKey: ["platform-applications"],
    queryFn: () => fetchPlatformApplications(),
  });
  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const currentApplicationId = extractCurrentApplicationId(pathname);
  const currentApplication = useMemo(
    () => applications.find((application) => application.applicationId === currentApplicationId) ?? null,
    [applications, currentApplicationId],
  );

  const openApplication = (application: PlatformApplicationDefinition) => {
    setLauncherOpen(false);
    setMobileOpen(false);
    router.push(application.routePath);
  };

  const content = (mobile = false) => (
    <nav aria-label={mobile ? "Mobile navigation" : "Primary navigation"} className="flex h-full flex-col gap-3 p-2">
      <div className="flex h-10 items-center justify-end">
        {mobile ? (
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu">
            <X className="size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        )}
      </div>

      <NavRow
        expanded={mobile || expanded}
        active={launcherOpen}
        label="Applications"
        icon={<Grid2x2 className="size-4" />}
        onClick={() => setLauncherOpen(true)}
        testId="applications-nav-item"
      />

      <Separator />

      {currentApplication ? (
        <NavRow
          expanded={mobile || expanded}
          active={pathname?.startsWith(currentApplication.routePath)}
          label={currentApplication.title}
          icon={(() => {
            const Icon = resolveApplicationIcon(currentApplication.iconKey);
            return <Icon className="size-4" />;
          })()}
          href={currentApplication.routePath}
          testId="current-application-nav-item"
        />
      ) : null}

      <div className="mt-auto flex flex-col gap-1">
        <Separator />
        <NavRow
          expanded={mobile || expanded}
          active={pathname?.startsWith("/docs")}
          label="Documentation"
          icon={<BookOpen className="size-4" />}
          href="/docs"
        />
        <NavRow
          expanded={mobile || expanded}
          label="Keybindings"
          icon={<Keyboard className="size-4" />}
          onClick={() => window.dispatchEvent(new CustomEvent("show-keyboard-shortcuts"))}
        />
        <div className={cn("px-1", mobile || expanded ? "" : "flex justify-center")}>
          <OperatorModeToggle ariaLabel="Operator mode" />
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="bg-background fixed top-3 left-3 z-50 md:hidden"
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-4" />
      </Button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="bg-background/80 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside className="bg-background absolute inset-y-0 left-0 w-56 border-r shadow-xl">
            <div className="h-full overflow-y-auto">{content(true)}</div>
          </aside>
        </div>
      ) : null}

      <aside
        className={cn(
          "bg-background/95 supports-[backdrop-filter]:bg-background/80 z-40 hidden overflow-hidden border-r backdrop-blur md:sticky md:top-0 md:block md:h-screen md:shrink-0 md:transition-[width] md:duration-300",
          expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W,
        )}
      >
        <div className="h-full overflow-x-hidden overflow-y-auto">{content()}</div>
      </aside>

      <ApplicationsLauncher
        applications={applications}
        currentApplicationId={currentApplicationId}
        open={launcherOpen}
        onOpenChange={setLauncherOpen}
        onOpenApplication={openApplication}
      />
    </>
  );
}
