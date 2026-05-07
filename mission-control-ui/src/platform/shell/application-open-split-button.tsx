"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type ApplicationOpenSplitButtonProps = {
  label?: string;
  applicationId: string;
  applicationTitle?: string;
  routePath?: string;
  disabled?: boolean;
  onOpenInShell: () => void;
  onOpenInNewTabSuccess?: () => void;
  className?: string;
  testId?: string;
};

export function openApplicationRouteInNewTab(routePath: string | undefined): boolean {
  if (!routePath || typeof window === "undefined") return false;

  try {
    const url = new URL(routePath, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    if (!url.pathname.startsWith("/apps")) return false;

    window.open(url.toString(), "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}

export function ApplicationOpenSplitButton({
  label = "Open",
  applicationId,
  applicationTitle,
  routePath,
  disabled = false,
  onOpenInShell,
  onOpenInNewTabSuccess,
  className,
  testId,
}: ApplicationOpenSplitButtonProps) {
  const handleOpenInNewTab = () => {
    const opened = openApplicationRouteInNewTab(routePath);
    if (opened) {
      onOpenInNewTabSuccess?.();
    }
  };
  const openInNewTabLabel = applicationTitle
    ? `Open ${applicationTitle} in new tab`
    : `Open ${applicationId} in new tab`;
  const newTabDisabled = disabled || !routePath;

  return (
    <div className={cn("inline-flex overflow-hidden rounded-md border shadow-xs", className)} data-testid={testId}>
      <button
        type="button"
        onClick={onOpenInShell}
        disabled={disabled}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-9 flex-1 items-center justify-center rounded-none rounded-l-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={handleOpenInNewTab}
        disabled={newTabDisabled}
        aria-label={openInNewTabLabel}
        title="Open in new tab"
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-9 w-9 items-center justify-center rounded-none rounded-r-md border-l transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ExternalLink className="size-4" />
      </button>
    </div>
  );
}
