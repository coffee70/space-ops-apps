"use client";

import type { SVGProps } from "react";
import { Bot, Cpu, Star } from "lucide-react";
import type { SimpleIcon } from "simple-icons";
import {
  siAnthropic,
  siGooglegemini,
  siMeta,
  siMistralai,
  siMoonshotai,
} from "simple-icons";

import type { ProviderRailKind } from "./provider-rail-meta";
import { cn } from "@/lib/utils";

/**
 * Official knot mark from Wikimedia Commons `OpenAI_logo_2025.svg` (`id="mark"` path only).
 * Embedded inline per project rules (no remote URLs / binary assets).
 */
const OPENAI_MARK_PATH = [
  "M123.2,118.3V85c0-2.2,0.6-3.8,2.9-5.1L187.9,44c8.3-4.8,18.9-7,29.2-7c39.1,0,63.8,30.1,63.8,62.5c0,2.6,0,6.1-0.6,9l-64.7-37.8c-3.2-1.9-6.7-2.2-10.6,0L123.2,118.3z",
  "M266.1,236.6v-74c0-4.2-1.6-7-5.4-9.3l-82-47.7l28.8-16.7c1.6-1,4.2-1,5.8,0l62.2,35.9c17.6,10.3,29.8,32.7,29.8,54.1C305.2,204.2,289.8,227.6,266.1,236.6z",
  "M106.2,172.8l-28.5-17c-2.2-1.3-2.9-2.9-2.9-5.1V79.3c0-34.9,26.6-61.2,62.8-61.2c14.1,0,27.6,4.8,38.4,13.5L111.7,69c-3.8,2.2-5.4,5.1-5.4,9.3V172.8z",
  "M162,204.9l-38.8-21.8v-46.1l38.8-21.8l38.4,21.8v46.1L162,204.9z",
  "M186,301.9c-14.1,0-27.6-4.8-38.4-13.5L212,251c3.8-2.2,5.4-5.1,5.4-9.3v-94.5l28.8,17c2.2,1.3,2.9,2.9,2.9,5.1v71.5C249.1,275.7,222.2,301.9,186,301.9z",
  "M110.4,231.1l-62.2-35.9c-17.6-10.3-29.8-32.7-29.8-54.1c0-25.6,15.7-48.7,39.4-57.7v74.3c0,4.2,1.6,7,5.4,9.3l81.7,47.4l-28.8,16.7C114.6,232.1,112,232.1,110.4,231.1z",
  "M106.5,283c-36.8,0-63.8-27.6-63.8-61.8c0-3.2,0.3-6.4,0.6-9.3l64.4,37.2c3.8,2.2,7,2.2,10.9,0l81.7-47.4V235c0,2.2-0.6,3.8-2.9,5.1L135.7,276C127.4,280.8,116.8,283,106.5,283z",
  "M186,319.2c38.4,0,70.5-27.6,77.5-64.1c35.9-9,59-42.3,59-76.3c0-22.4-9.6-43.9-27.2-59.6c1.6-6.7,2.9-13.8,2.9-20.5c0-45.2-36.8-79.1-79.1-79.1c-8.7,0-17.3,1.6-25.6,4.5C179,9.7,159.4,0.8,137.6,0.8c-38.4,0-70.5,27.6-77.5,64.1c-35.9,9-59,42.3-59,76.3c0,22.4,9.6,43.9,27.2,59.6c-1.6,6.7-2.9,13.8-2.9,20.5c0,45.2,36.8,79.1,79.1,79.1c8.7,0,17.3-1.6,25.6-4.5C144.7,310.3,164.2,319.2,186,319.2z",
].join("");

function OpenAiBrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" aria-hidden fill="currentColor" className={className}>
      <path d={OPENAI_MARK_PATH} />
    </svg>
  );
}

const RAIL_MONOGRAM_FRAME =
  "flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-[9px] font-semibold leading-none tracking-tight";

const INLINE_MONOGRAM_FRAME =
  "inline-flex size-4 shrink-0 items-center justify-center rounded border border-border/50 bg-muted/40 text-[6px] font-semibold leading-none tracking-tight";

function SimpleBrandSvg({
  icon,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { icon: SimpleIcon }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" className={className} {...props}>
      <path d={icon.path} />
    </svg>
  );
}

export type ProviderRailIconDescriptor =
  | { source: "simple-icon"; brandTitle: string }
  | { source: "openai-mark" }
  | { source: "lucide"; name: "star" | "cpu" | "bot" }
  | { source: "monogram"; text: "xAI" };

/** Pure mapping for tests and telemetry — keeps SVG rendering out of unit tests. */
export function getProviderRailIconDescriptor(kind: ProviderRailKind): ProviderRailIconDescriptor {
  switch (kind) {
    case "recommended":
      return { source: "lucide", name: "star" };
    case "openai":
      return { source: "openai-mark" };
    case "anthropic":
      return { source: "simple-icon", brandTitle: siAnthropic.title };
    case "google":
      return { source: "simple-icon", brandTitle: siGooglegemini.title };
    case "meta":
      return { source: "simple-icon", brandTitle: siMeta.title };
    case "mistral":
      return { source: "simple-icon", brandTitle: siMistralai.title };
    case "moonshot":
      return { source: "simple-icon", brandTitle: siMoonshotai.title };
    case "xai":
      return { source: "monogram", text: "xAI" };
    case "local_hardware":
      return { source: "lucide", name: "cpu" };
    default:
      return { source: "lucide", name: "bot" };
  }
}

export function ProviderRailBrandIcon({
  kind,
  className,
  density = "rail",
}: {
  kind: ProviderRailKind;
  className?: string;
  /** `rail`: left provider column (room for optional framed monogram). `inline`: compact icon beside a model name. */
  density?: "rail" | "inline";
}) {
  const cls = cn("size-4 shrink-0", className);

  switch (kind) {
    case "recommended":
      return <Star className={cn(cls, "fill-amber-400 text-amber-400")} aria-hidden />;
    case "openai":
      return <OpenAiBrandMark className={cls} />;
    case "anthropic":
      return <SimpleBrandSvg icon={siAnthropic} className={cls} />;
    case "google":
      return <SimpleBrandSvg icon={siGooglegemini} className={cls} />;
    case "meta":
      return <SimpleBrandSvg icon={siMeta} className={cls} />;
    case "mistral":
      return <SimpleBrandSvg icon={siMistralai} className={cls} />;
    case "moonshot":
      return <SimpleBrandSvg icon={siMoonshotai} className={cls} />;
    case "xai":
      return (
        <span
          className={cn(density === "inline" ? INLINE_MONOGRAM_FRAME : RAIL_MONOGRAM_FRAME, className)}
          aria-hidden
        >
          xAI
        </span>
      );
    case "local_hardware":
      return <Cpu className={cls} aria-hidden />;
    default:
      return <Bot className={cls} aria-hidden />;
  }
}
