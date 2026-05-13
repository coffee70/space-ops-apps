"use client";

import type { KnowledgeDocument, KnowledgeUploadInput, KnowledgeUploadResponse } from "@/applications/knowledge/types";
import { fetchJson } from "@/lib/api-client";

const DOCUMENTS_ROUTE = "/intelligence/documents";

export async function listKnowledgeDocuments(signal?: AbortSignal): Promise<KnowledgeDocument[]> {
  const data = await fetchJson<KnowledgeDocument[]>(DOCUMENTS_ROUTE, { signal, cache: "no-store" });
  return Array.isArray(data) ? data : [];
}

export async function uploadKnowledgeDocument(input: KnowledgeUploadInput): Promise<KnowledgeUploadResponse> {
  const formData = new FormData();
  formData.set("file", input.file);
  if (input.title?.trim()) formData.set("title", input.title.trim());
  if (input.documentType?.trim()) formData.set("document_type", input.documentType.trim());
  if (input.missionId?.trim()) formData.set("mission_id", input.missionId.trim());
  if (input.vehicleId?.trim()) formData.set("vehicle_id", input.vehicleId.trim());
  if (input.subsystemId?.trim()) formData.set("subsystem_id", input.subsystemId.trim());
  if (input.tags?.trim()) formData.set("tags", input.tags.trim());
  if (input.description?.trim()) formData.set("description", input.description.trim());

  return fetchJson<KnowledgeUploadResponse>(DOCUMENTS_ROUTE, {
    method: "POST",
    body: formData,
  });
}

export function titleFromFile(file: File | null): string {
  if (!file?.name) return "";
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

export function documentTypeFromFile(file: File | null): string {
  if (!file?.name || !file.name.includes(".")) return "text";
  return file.name.split(".").pop()?.toLowerCase() || "text";
}
