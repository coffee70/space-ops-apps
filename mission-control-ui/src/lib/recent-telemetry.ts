import { z } from "zod";

const RECENT_STORAGE_KEY = "telemetry_recent";
const RECENT_MAX = 12;

export interface RecentTelemetryEntry {
  sourceId: string;
  name: string;
}

const RecentTelemetryEntrySchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
});

const RecentTelemetryStorageSchema = z.array(z.union([z.string(), RecentTelemetryEntrySchema]));

export function getRecentChannels(): RecentTelemetryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = RecentTelemetryStorageSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.flatMap((entry) => (typeof entry === "string" ? [] : [entry]));
  } catch {
    return [];
  }
}

export function addToRecent(sourceId: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentChannels();
    const filtered = current.filter((entry) => !(entry.sourceId === sourceId && entry.name === name));
    const updated = [{ sourceId, name }, ...filtered].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
