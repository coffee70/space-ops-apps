"use client";

import { AlertTriangle, CheckCircle2, Circle, Clock3, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCodeRepositoryStatusQueries, type CodeRepositoryStatus } from "@/lib/query-hooks";

const MANAGED_REPOSITORIES = [
  { name: "Space Ops Platform", root: "project/space-ops-platform", branch: "main" },
  { name: "Space Ops Apps", root: "project/space-ops-apps", branch: "main" },
] as const;

export type CodeRepositoryReadiness = "ready" | "queued" | "indexing" | "failed" | "not-indexed" | "unavailable";

const READINESS_LABELS: Record<CodeRepositoryReadiness, string> = {
  ready: "Ready",
  queued: "Queued",
  indexing: "Indexing",
  failed: "Failed",
  "not-indexed": "Not Indexed",
  unavailable: "Unavailable",
};

const READINESS_CLASSES: Record<CodeRepositoryReadiness, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  indexing: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  "not-indexed": "border-muted bg-muted text-muted-foreground",
  unavailable: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

function readinessIcon(readiness: CodeRepositoryReadiness) {
  if (readiness === "ready") return <CheckCircle2 className="size-3.5" />;
  if (readiness === "queued") return <Clock3 className="size-3.5" />;
  if (readiness === "indexing") return <RefreshCw className="size-3.5 animate-spin" />;
  if (readiness === "failed" || readiness === "unavailable") return <XCircle className="size-3.5" />;
  return <Circle className="size-3.5" />;
}

function ReadinessBadge({ readiness }: { readiness: CodeRepositoryReadiness }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", READINESS_CLASSES[readiness])}>
      {readinessIcon(readiness)}
      {READINESS_LABELS[readiness]}
    </Badge>
  );
}

export function getCodeRepositoryReadiness(status: CodeRepositoryStatus | null | undefined): CodeRepositoryReadiness {
  if (!status) return "not-indexed";
  if (status.index_status === "queued") return "queued";
  if (status.index_status === "indexing") return "indexing";
  if (status.index_status === "failed") return "failed";
  if (
    status.index_status === "ready" &&
    Boolean(status.indexed_commit_sha) &&
    Boolean(status.current_commit_sha) &&
    status.indexed_commit_sha === status.current_commit_sha &&
    status.chunk_count > 0
  ) {
    return "ready";
  }
  return "not-indexed";
}

function formatShortSha(value?: string | null) {
  return value ? value.slice(0, 12) : "Not available";
}

function formatTime(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Unable to load repository status.";
}

function RepositoryStatusCard({
  name,
  root,
  branch,
  status,
  readiness,
  error,
}: {
  name: string;
  root: string;
  branch: string;
  status?: CodeRepositoryStatus | null;
  readiness: CodeRepositoryReadiness;
  error?: unknown;
}) {
  return (
    <Card data-testid={`code-repository-status-${root}`}>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>{status?.name || name}</CardTitle>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span className="font-mono">{status?.source_uri || root}</span>
            <span>branch: {status?.default_branch || branch}</span>
            {status?.index_status ? <span>status: {status.index_status}</span> : null}
          </div>
        </div>
        <ReadinessBadge readiness={readiness} />
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Status request failed</AlertTitle>
            <AlertDescription>{errorMessage(error)}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-muted-foreground text-xs font-medium uppercase">Indexed Commit</div>
            <div className="font-mono">{formatShortSha(status?.indexed_commit_sha)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs font-medium uppercase">Current Commit</div>
            <div className="font-mono">{formatShortSha(status?.current_commit_sha)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs font-medium uppercase">Chunks</div>
            <div>{status?.chunk_count ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs font-medium uppercase">Completed</div>
            <div>{formatTime(status?.index_completed_at)}</div>
          </div>
        </div>

        {status ? (
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>{status.file_count} files</span>
            <span>{status.skipped_file_count} skipped</span>
            <span>{status.failed_file_count} failed</span>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">No repository status record exists for this managed root and branch.</p>
        )}

        {status?.last_error ? (
          <pre className="bg-muted/40 text-foreground max-h-32 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {status.last_error}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CodeRepositoryControlPanelSection() {
  const statusQueries = useCodeRepositoryStatusQueries(MANAGED_REPOSITORIES);
  const isLoading = statusQueries.some((query) => query.isLoading);
  const isFetching = statusQueries.some((query) => query.isFetching);
  const readyCount = statusQueries.filter((query) => getCodeRepositoryReadiness(query.data?.status) === "ready").length;

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner size="lg" className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full" data-testid="code-repository-control-panel-section">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Code Repository</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
              Check whether the managed code indexes required by AI Engineer are ready for repository-aware context.
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              {readyCount} / {MANAGED_REPOSITORIES.length} ready · branch main
            </p>
          </div>
          <Button variant="outline" onClick={() => statusQueries.forEach((query) => void query.refetch())} disabled={isFetching}>
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4">
          {MANAGED_REPOSITORIES.map((repository, index) => {
            const query = statusQueries[index];
            const status = query.data?.status ?? null;
            const readiness = query.isError ? "unavailable" : getCodeRepositoryReadiness(status);
            return (
              <RepositoryStatusCard
                key={repository.root}
                name={repository.name}
                root={repository.root}
                branch={repository.branch}
                status={status}
                readiness={readiness}
                error={query.isError ? query.error : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
