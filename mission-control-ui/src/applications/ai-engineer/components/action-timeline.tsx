"use client";

import { AiEngineerActivityPanel } from "@/applications/ai-engineer/components/ai-engineer-activity-panel";
import type { ChatEvent } from "@/applications/ai-engineer/types";

export function ActionTimeline({ events }: { events: ChatEvent[] }) {
  return <AiEngineerActivityPanel events={events} attachments={[]} />;
}
