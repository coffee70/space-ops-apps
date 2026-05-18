import { PlatformApplicationDefinitionSchema } from "@/platform/registry/application-schemas";
import { z } from "zod";

export function getControlPlaneServerUrl(): string {
  return process.env.CONTROL_PLANE_SERVER_URL || "http://control-plane:8100";
}

async function readApplications(response: Response) {
  if (!response.ok) {
    throw new Error("Failed to load applications registry");
  }

  const parsed = z.array(PlatformApplicationDefinitionSchema).safeParse(await response.json());
  if (!parsed.success) {
    console.error("Application registry validation error:", parsed.error.issues);
    throw new Error("Application registry returned invalid application definitions");
  }
  return parsed.data;
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
