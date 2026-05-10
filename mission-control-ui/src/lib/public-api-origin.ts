/**
 * Client-side fetch base from NEXT_PUBLIC_API_URL.
 *
 * - Unset, empty, or whitespace-only → `""` (same-origin relative paths). Intended for the Layer 1
 *   edge proxy at `http://localhost:8080`, so `/intelligence/*`, `/telemetry/*`, etc. stay on the
 *   browser origin.
 * - Set explicitly when serving Mission Control directly on `:3000` without the edge proxy, e.g.
 *   `http://localhost:8000`, so the browser can reach `platform-api`.
 *
 * Optional `NEXT_PUBLIC_API_FALLBACK_URL`: secondary base for idempotent retries (see getPublicFetchBases).
 */
export function resolvePublicApiUrl(): string {
  const trimmed = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!trimmed) return "";
  return trimmed;
}

export function getPublicFetchBases(includeFallbackSecondary: boolean): string[] {
  const bases: string[] = [resolvePublicApiUrl()];
  const secondary = process.env.NEXT_PUBLIC_API_FALLBACK_URL?.trim();
  if (includeFallbackSecondary && secondary) bases.push(secondary);
  return [...new Set(bases)];
}
