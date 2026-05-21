"use client";

import { z } from "zod";

import { resolvePublicApiUrl } from "@/lib/public-api-origin";

const PermissionStatusResponseSchema = z
  .object({
    permission_request_id: z.string(),
    tool_call_id: z.string(),
    status: z.enum(["pending", "approved", "denied", "executing", "executed", "failed", "expired"]),
    response_json: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();

export type ToolPermissionStatusResponse = z.infer<typeof PermissionStatusResponseSchema>;

function apiUrl(path: string): string {
  const base = resolvePublicApiUrl().replace(/\/$/, "");
  return `${base}${path}`;
}

async function parsePermissionResponse(response: Response): Promise<ToolPermissionStatusResponse> {
  const raw = await response.json();
  const parsed = PermissionStatusResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid tool permission response from server");
  }
  return parsed.data;
}

export async function approveToolPermission(permissionRequestId: string): Promise<ToolPermissionStatusResponse> {
  const response = await fetch(apiUrl(`/intelligence/tools/permissions/${permissionRequestId}/approve`), {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error((await response.text()) || "Failed to approve tool permission");
  }
  return parsePermissionResponse(response);
}

export async function denyToolPermission(permissionRequestId: string, reason = "user_denied"): Promise<ToolPermissionStatusResponse> {
  const response = await fetch(apiUrl(`/intelligence/tools/permissions/${permissionRequestId}/deny`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || "Failed to deny tool permission");
  }
  return parsePermissionResponse(response);
}
