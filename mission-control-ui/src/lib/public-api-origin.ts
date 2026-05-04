/**
 * Client-side fetch base derived from NEXT_PUBLIC_API_URL.
 * Empty string uses same-origin paths (Compose + Next fallback rewrites to platform-api).
 */
export function resolvePublicApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw === "") return "";
  return raw ?? "http://localhost:8000";
}

export function getPublicFetchBases(includeFallbackSecondary: boolean): string[] {
  const bases: string[] = [resolvePublicApiUrl()];
  const secondary = process.env.NEXT_PUBLIC_API_FALLBACK_URL;
  if (includeFallbackSecondary && secondary) bases.push(secondary);
  return [...new Set(bases)];
}
