import type { PlatformApplicationDefinition } from "@/platform/registry/application-types";

export function getControlPlaneServerUrl(): string {
  return process.env.CONTROL_PLANE_SERVER_URL || "http://control-plane:8100";
}

async function readApplications(response: Response): Promise<PlatformApplicationDefinition[]> {
  if (!response.ok) {
    throw new Error("Failed to load applications registry");
  }

  return (await response.json()) as PlatformApplicationDefinition[];
}

export async function fetchPlatformApplications(signal?: AbortSignal) {
  const response = await fetch("/registry/applications", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  return readApplications(response);
}

export async function fetchPlatformApplicationsServer() {
  const response = await fetch(`${getControlPlaneServerUrl()}/registry/applications`, {
    cache: "no-store",
  });

  return readApplications(response);
}
