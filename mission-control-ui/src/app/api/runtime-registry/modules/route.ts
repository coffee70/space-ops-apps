import { NextResponse } from "next/server";

const CONTROL_PLANE_URL =
  process.env.CONTROL_PLANE_SERVER_URL || process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || "http://localhost:8100";

export async function GET() {
  const response = await fetch(`${CONTROL_PLANE_URL}/registry/modules`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { detail: "Failed to load runtime modules" },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as Array<{
    unit_id: string;
    display_name: string;
    deployment_status: string;
    health_status: string;
    discovery_metadata_json: {
      route_slug?: string;
      target_url?: string;
      description?: string;
      icon_key?: string;
      open_path?: string;
    };
  }>;

  return NextResponse.json(
    payload.map((item) => ({
      unit_id: item.unit_id,
      display_name: item.display_name,
      unit_kind: "module" as const,
      route_slug: item.discovery_metadata_json.route_slug || item.unit_id,
      target_url: item.discovery_metadata_json.target_url,
      description: item.discovery_metadata_json.description,
      icon_key: item.discovery_metadata_json.icon_key,
      open_path: item.discovery_metadata_json.open_path,
      status: item.health_status || item.deployment_status,
    })),
  );
}

