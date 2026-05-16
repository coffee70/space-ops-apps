"use client";

import { getPublicFetchBases } from "@/lib/public-api-origin";
import { z, type ZodSchema } from "zod";

export interface ApiError extends Error {
  status?: number;
  detail?: string;
  errors?: unknown[];
}

function getApiBases(useFallback = false): string[] {
  return getPublicFetchBases(useFallback);
}

function isIdempotentMethod(method: string | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD";
}

const ApiErrorDetailSchema = z.union([
  z.string(),
  z.object({
    message: z.string().optional(),
    errors: z.array(z.unknown()).optional(),
  }),
]);

const ApiErrorBodySchema = z.object({
  detail: ApiErrorDetailSchema.optional(),
  message: z.string().optional(),
  errors: z.array(z.unknown()).optional(),
});

const ApiErrorLikeSchema = z.object({
  errors: z.array(z.unknown()).optional(),
});

async function parseError(response: Response): Promise<ApiError> {
  let message = response.statusText || `HTTP ${response.status}`;
  let detail: string | undefined;
  let errors: unknown[] | undefined;

  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = ApiErrorBodySchema.safeParse(JSON.parse(text));
        if (!parsed.success) {
          detail = text;
          message = text;
        } else {
          const json = parsed.data;

          if (typeof json.detail === "string") {
            detail = json.detail;
            message = detail || message;
          } else if (json.detail) {
            detail = json.detail.message ?? detail;
            errors = json.detail.errors ?? errors;
            message = detail || message;
          }

          if (json.message && !detail) {
            message = json.message;
          }
          if (json.errors && !errors) {
            errors = json.errors;
          }
        }
      } catch {
        detail = text;
        message = text;
      }
    }
  } catch {}

  const error = new Error(message) as ApiError;
  error.status = response.status;
  error.detail = detail;
  error.errors = errors;
  return error;
}

export async function fetchJson<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal; useFallback?: boolean } = {},
  schema?: ZodSchema<T>
): Promise<T> {
  const { useFallback = false, ...requestInit } = init;
  const bases = getApiBases(useFallback && isIdempotentMethod(requestInit.method));
  let lastError: unknown = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, requestInit);
      if (!response.ok) {
        throw await parseError(response);
      }
      if (response.status === 204) {
        return undefined as T;
      }
      const raw = await response.json();
      return schema ? schema.parse(raw) : (raw as T);
    } catch (error) {
      if (requestInit.signal?.aborted) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new Error("Request failed");
}

export async function fetchVoid(
  path: string,
  init: RequestInit & { signal?: AbortSignal; useFallback?: boolean } = {}
): Promise<void> {
  await fetchJson(path, init);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getErrorErrors<T = unknown>(error: unknown): T[] {
  const parsed = ApiErrorLikeSchema.safeParse(error);
  if (!parsed.success) return [];
  return (parsed.data.errors ?? []) as T[];
}
