import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Battery,
  ChartNoAxesCombined,
  FolderCode,
  LayoutDashboard,
  SatelliteDish,
  Settings,
  Sparkles,
  Server,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "app-window": AppWindow,
  battery: Battery,
  "chart-no-axes-combined": ChartNoAxesCombined,
  "folder-code": FolderCode,
  "layout-dashboard": LayoutDashboard,
  "satellite-dish": SatelliteDish,
  settings: Settings,
  sparkles: Sparkles,
  server: Server,
};

export function resolveApplicationIcon(iconKey: string) {
  return ICONS[iconKey] ?? AppWindow;
}
