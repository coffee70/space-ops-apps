export interface RuntimeModuleRecord {
  unit_id: string;
  display_name: string;
  unit_kind: "module";
  route_slug: string;
  target_url?: string;
  status: string;
  description?: string;
  icon_key?: string;
  open_path?: string;
}

export async function fetchRuntimeModules(signal?: AbortSignal): Promise<RuntimeModuleRecord[]> {
  const response = await fetch("/api/runtime-registry/modules", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load runtime modules");
  }

  return (await response.json()) as RuntimeModuleRecord[];
}

