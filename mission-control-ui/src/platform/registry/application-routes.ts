export const APPLICATION_BASE_PATH = "/apps";

const MAX_APPLICATION_PATH_SEGMENT_LENGTH = 255;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function decodeApplicationPathSegment(segment: string): string[] | null {
  const decodedSegments = [segment];
  let current = segment;

  for (let index = 0; index < 2; index += 1) {
    if (!current.includes("%")) break;

    try {
      current = decodeURIComponent(current);
    } catch {
      return null;
    }

    decodedSegments.push(current);
  }

  return decodedSegments;
}

function isUnsafeApplicationPathSegment(segment: string) {
  const normalizedSegment = segment.normalize("NFC");
  const lowerSegment = normalizedSegment.toLowerCase();

  return (
    normalizedSegment.length === 0 ||
    normalizedSegment.length > MAX_APPLICATION_PATH_SEGMENT_LENGTH ||
    normalizedSegment === "." ||
    normalizedSegment === ".." ||
    normalizedSegment.includes("/") ||
    normalizedSegment.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(normalizedSegment) ||
    lowerSegment.startsWith("http:") ||
    lowerSegment.startsWith("https:") ||
    lowerSegment.includes("://")
  );
}

export function validateApplicationPathSegments(pathSegments: string[]): string[] | null {
  const safeSegments: string[] = [];

  for (const segment of pathSegments) {
    if (segment.length > MAX_APPLICATION_PATH_SEGMENT_LENGTH) return null;

    const decodedSegments = decodeApplicationPathSegment(segment);
    if (!decodedSegments) return null;

    if (decodedSegments.some(isUnsafeApplicationPathSegment)) {
      return null;
    }

    safeSegments.push(segment);
  }

  return safeSegments;
}

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
