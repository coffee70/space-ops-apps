"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SimulatorPanel } from "@/components/simulator-panel";
import { Button } from "@/components/ui/button";
import { useTelemetrySourcesQuery } from "@/lib/query-hooks";
import { buildApplicationRoute } from "@/platform/registry/application-routes";

export function SimulatorManagePageClient({ sourceId }: { sourceId: string }) {
  const sourcesQuery = useTelemetrySourcesQuery<{ id: string; name: string }[]>();
  const sourceName = sourcesQuery.data?.find((source) => source.id === sourceId)?.name ?? sourceId;

  if (!sourceId) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8" data-testid="simulator-manage-content">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href={buildApplicationRoute("control-panel")}>
              <ArrowLeft className="size-4" />
              Back to Sources
            </Link>
          </Button>

          <div>
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl" title={sourceName}>
              {sourceName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage simulator playback and runtime controls.</p>
          </div>
        </div>

        <SimulatorPanel sourceId={sourceId} />
      </div>
    </div>
  );
}
