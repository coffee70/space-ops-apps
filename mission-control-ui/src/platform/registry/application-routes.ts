export const APPLICATION_BASE_PATH = "/apps";

export function buildApplicationRoute(
  applicationId: string,
  pathSegments: string[] = [],
) {
  const encodedSegments = pathSegments
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment));
  return [`${APPLICATION_BASE_PATH}/${applicationId}`, ...encodedSegments].join("/");
}

export function buildApplicationRouteWithQuery(
  applicationId: string,
  pathSegments: string[] = [],
  params?: URLSearchParams,
) {
  const route = buildApplicationRoute(applicationId, pathSegments);
  const query = params?.toString();
  return query ? `${route}?${query}` : route;
}

export function extractCurrentApplicationId(pathname: string | null): string | null {
  if (!pathname?.startsWith(`${APPLICATION_BASE_PATH}/`)) return null;
  const segments = pathname.split("/").filter(Boolean);
  return segments[1] ?? null;
}

export function extractCurrentApplicationPath(pathname: string | null): string[] {
  if (!pathname?.startsWith(`${APPLICATION_BASE_PATH}/`)) return [];
  const segments = pathname.split("/").filter(Boolean);
  return segments.slice(2).map(decodeURIComponent);
}
