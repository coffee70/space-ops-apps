"use client";

import { useOperatorMode, type OperatorMode } from "@/components/app-providers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonitorIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<OperatorMode, string> = {
  default: "Default",
  "high-contrast": "High contrast",
  "large-type": "Large type",
};

interface OperatorModeToggleProps {
  className?: string;
  ariaLabel?: string;
}

export function OperatorModeToggle({ className, ariaLabel }: OperatorModeToggleProps) {
  const { mode, setMode } = useOperatorMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-lg border bg-background px-2.75 text-sm font-medium text-muted-foreground shadow-xs transition-colors",
            "hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            className,
          )}
          title="Display mode for long console shifts"
          aria-label={ariaLabel ?? `Screen type (${MODE_LABELS[mode]})`}
        >
          <MonitorIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 overflow-hidden whitespace-nowrap">
            {MODE_LABELS[mode]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as OperatorMode)}>
          <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="high-contrast">High contrast</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="large-type">Large type</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
