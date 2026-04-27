import { redirect } from "next/navigation";
import { buildApplicationRouteWithQuery } from "@/platform/registry/application-routes";

export default async function TimelineRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  const resolved = await searchParams;

  for (const [key, value] of Object.entries(resolved)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }

  params.set("tab", "event-history");
  redirect(buildApplicationRouteWithQuery("overview", [], params));
}
