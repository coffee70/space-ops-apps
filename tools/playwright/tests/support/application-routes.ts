type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;

function appendQueryValue(params: URLSearchParams, key: string, value: QueryValue) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry != null) {
        params.append(key, String(entry));
      }
    }
    return;
  }
  params.set(key, String(value));
}

function normalizeQuery(
  query?: URLSearchParams | Record<string, QueryValue>,
): URLSearchParams {
  if (!query) return new URLSearchParams();
  if (query instanceof URLSearchParams) {
    return new URLSearchParams(query);
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    appendQueryValue(params, key, value);
  }
  return params;
}

export function appUrl(
  applicationId: string,
  pathSegments: string[] = [],
  query?: URLSearchParams | Record<string, QueryValue>,
): string {
  const encodedSegments = pathSegments
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment));
  const path = ["/apps", applicationId, ...encodedSegments].join("/");
  const params = normalizeQuery(query);
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
