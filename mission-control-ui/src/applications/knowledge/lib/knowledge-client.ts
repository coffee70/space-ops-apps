"use client";

import type { KnowledgeDocument, KnowledgeUploadInput, KnowledgeUploadResponse } from "@/applications/knowledge/types";
import { fetchJson } from "@/lib/api-client";

const DOCUMENTS_ROUTE = "/intelligence/documents";

export const SUPPORTED_KNOWLEDGE_FILE_EXTENSIONS = [
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".csv",
] as const;

export const KNOWLEDGE_FILE_ACCEPT = SUPPORTED_KNOWLEDGE_FILE_EXTENSIONS.join(",");

const SUPPORTED_KNOWLEDGE_FILE_EXTENSION_SET = new Set<string>(SUPPORTED_KNOWLEDGE_FILE_EXTENSIONS);

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

function extensionOfFileName(name: string): string {
  const extensionStart = name.lastIndexOf(".");
  if (extensionStart <= 0) return "";
  return name.slice(extensionStart).toLowerCase();
}

export function isSupportedKnowledgeFile(file: Pick<File, "name">): boolean {
  return SUPPORTED_KNOWLEDGE_FILE_EXTENSION_SET.has(extensionOfFileName(file.name));
}

export function filterSupportedKnowledgeFiles<T extends Pick<File, "name">>(files: T[]): {
  supported: T[];
  unsupported: T[];
} {
  return files.reduce(
    (partition, file) => {
      partition[isSupportedKnowledgeFile(file) ? "supported" : "unsupported"].push(file);
      return partition;
    },
    { supported: [] as T[], unsupported: [] as T[] },
  );
}

export function unsupportedKnowledgeFilesMessage(unsupportedCount: number): string {
  if (unsupportedCount <= 0) return "";
  const prefix = unsupportedCount === 1 ? "Unsupported file was skipped." : "Some files were skipped.";
  return `${prefix} Knowledge currently accepts Markdown, text, JSON, YAML, and CSV documents.`;
}

export function titleFromFile(file: File | null): string {
  if (!file?.name) return "";
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

export function documentTypeFromFile(file: File | null): string {
  if (!file?.name || !file.name.includes(".")) return "text";
  return file.name.split(".").pop()?.toLowerCase() || "text";
}
