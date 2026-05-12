"use client";

import { AlertTriangle, CheckCircle2, Circle, Clock3, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useDeploymentOverviewQuery,
  type DeploymentUiState,
  type ServiceGroupSummary,
  type ServiceStatusItem,
  type SystemDeploymentOverviewResponse,
} from "@/lib/query-hooks";

const STATE_LABELS: Record<DeploymentUiState, string> = {
  healthy: "Healthy",
  deploying: "Deploying",
  stale: "Stale",
  missing: "Missing",
  failed: "Failed",
  crashed: "Crashed",
  unknown: "Unknown",
  skipped: "Skipped",
};

const STATE_CLASSES: Record<DeploymentUiState, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  deploying: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  stale: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  missing: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  crashed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  unknown: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  skipped: "border-muted bg-muted text-muted-foreground",
};

function formatTime(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function statusIcon(state: DeploymentUiState) {
  if (state === "healthy") return <CheckCircle2 className="size-3.5" />;
  if (state === "failed" || state === "crashed" || state === "missing") return <XCircle className="size-3.5" />;
  if (state === "deploying") return <Clock3 className="size-3.5" />;
  if (state === "stale" || state === "unknown") return <AlertTriangle className="size-3.5" />;
  return <Circle className="size-3.5" />;
}

function StatusBadge({ state }: { state: DeploymentUiState }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", STATE_CLASSES[state])}>
      {statusIcon(state)}
      {STATE_LABELS[state]}
    </Badge>
  );
}

function formatStatusLabel(value?: string | null): string {
  if (!value) return "Not started";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "bg-background/80 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm shadow-xs",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/10",
        tone === "warning" && "border-amber-500/30 bg-amber-500/10",
        tone === "danger" && "border-red-500/30 bg-red-500/10",
      )}
    >
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</span>
      <span className="text-foreground min-w-0 font-semibold break-words whitespace-normal">{value}</span>
    </div>
  );
}

function stateTone(state?: string | null): "default" | "success" | "warning" | "danger" {
  if (state === "healthy" || state === "completed") return "success";
  if (state === "broken" || state === "failed" || state === "crashed" || state === "missing") return "danger";
  if (state === "degraded" || state === "completed_with_failures" || state === "deploying" || state === "running") return "warning";
  return "default";
}

function DeploymentSummaryStrip({ overview }: { overview: SystemDeploymentOverviewResponse }) {
  const bootstrap = overview.bootstrap;
  const failedUnits = bootstrap?.summary?.failed ?? 0;
  const bootstrapValue = [
    formatStatusLabel(bootstrap?.status),
    failedUnits > 0 ? `${failedUnits} failed` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="border-border/70 bg-muted/20 flex flex-wrap gap-2 rounded-2xl border p-3" data-testid="deployment-summary-strip">
      <SummaryPill label="System" value={formatStatusLabel(overview.overall_state)} tone={stateTone(overview.overall_state)} />
      <SummaryPill label="Core" value={`${overview.core.existing_count} / ${overview.core.expected_count} existing`} />
      <SummaryPill label="Runtime" value={`${overview.runtime.existing_count} / ${overview.runtime.expected_count} existing`} />
      <SummaryPill label="Bootstrap" value={bootstrapValue} tone={stateTone(bootstrap?.status)} />
    </div>
  );
}

function ServiceGroupPanel({ title, summary, group }: { title: string; summary: ServiceGroupSummary; group: "core" | "runtime" }) {
  return (
    <Card data-testid={`${group}-services-panel`}>
      <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary.existing_count} / {summary.expected_count} existing · {summary.healthy_count} healthy · {summary.broken_count} broken
          </p>
        </div>
        <Badge variant="outline">{summary.existing_count} / {summary.expected_count}</Badge>
      </CardHeader>
      <CardContent>
        {group === "core" ? (
          <CoreServiceStatusTable services={summary.services} />
        ) : (
          <RuntimeServiceStatusTable services={summary.services} />
        )}
      </CardContent>
    </Card>
  );
}

function CoreServiceStatusTable({ services }: { services: ServiceStatusItem[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-52">Service</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Container</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Checked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <CoreServiceStatusRow key={`${service.group}-${service.id}`} service={service} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RuntimeServiceStatusTable({ services }: { services: ServiceStatusItem[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-52">Service</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Deployment</TableHead>
            <TableHead>Bootstrap</TableHead>
            <TableHead>Container</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <RuntimeServiceStatusRow key={`${service.group}-${service.id}`} service={service} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ServiceNameCell({ service }: { service: ServiceStatusItem }) {
  const showFallbackId = !service.display_name || service.display_name === service.id;
  return (
    <TableCell>
      <div className="font-medium" title={service.id}>{service.display_name || service.id}</div>
      {showFallbackId && service.service_slug && service.service_slug !== service.id ? (
        <div className="text-muted-foreground font-mono text-xs">{service.service_slug}</div>
      ) : null}
    </TableCell>
  );
}

function detailsColSpan(service: ServiceStatusItem) {
  return service.group === "core" ? 5 : 6;
}

function ServiceDetailsRow({ service }: { service: ServiceStatusItem }) {
  const hasDetails = Boolean(service.failure_reason || service.latest_error || service.active_deployment_id || service.latest_deployment_id);
  if (!hasDetails) return null;
  return (
    <TableRow>
      <TableCell colSpan={detailsColSpan(service)} className="bg-muted/20">
        <details className="group">
          <summary className="text-muted-foreground group-open:text-foreground cursor-pointer text-xs font-medium">
            Details and latest error context
          </summary>
          <div className="text-muted-foreground mt-2 grid gap-2 text-xs">
            {service.failure_reason ? <p className="text-red-600 dark:text-red-300">{service.failure_reason}</p> : null}
            {service.latest_error && service.latest_error !== service.failure_reason ? (
              <pre className="bg-background max-h-40 overflow-auto rounded-md p-3 whitespace-pre-wrap">{service.latest_error}</pre>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>unit id: {service.id}</span>
              {service.active_deployment_id ? <span>active: {service.active_deployment_id}</span> : null}
              {service.latest_deployment_id ? <span>latest: {service.latest_deployment_id}</span> : null}
              {service.logs_url ? (
                <span>
                  logs:{" "}
                  <a
                    href={service.logs_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {service.logs_url}
                  </a>
                </span>
              ) : null}
              {service.branch ? <span>branch: {service.branch}</span> : null}
              {service.commit_sha ? <span>commit: {service.commit_sha.slice(0, 12)}</span> : null}
            </div>
          </div>
        </details>
      </TableCell>
    </TableRow>
  );
}

function CoreServiceStatusRow({ service }: { service: ServiceStatusItem }) {
  return (
    <>
      <TableRow data-testid={`deployment-service-${service.id}`}>
        <ServiceNameCell service={service} />
        <TableCell>
          <StatusBadge state={service.ui_state} />
        </TableCell>
        <TableCell>
          <div>{service.container_state ?? (service.exists ? "recorded" : "missing")}</div>
          <div className="text-muted-foreground max-w-64 truncate text-xs">{service.container_status ?? service.service_slug ?? "Not available"}</div>
        </TableCell>
        <TableCell>{service.health_status ?? "health unknown"}</TableCell>
        <TableCell>{formatTime(service.last_checked_at ?? service.updated_at)}</TableCell>
      </TableRow>
      <ServiceDetailsRow service={service} />
    </>
  );
}

function RuntimeServiceStatusRow({ service }: { service: ServiceStatusItem }) {
  return (
    <>
      <TableRow data-testid={`deployment-service-${service.id}`}>
        <ServiceNameCell service={service} />
        <TableCell>
          <StatusBadge state={service.ui_state} />
        </TableCell>
        <TableCell>
          <div>{service.deployment_status ?? "Not available"}</div>
          <div className="text-muted-foreground text-xs">{service.health_status ?? "health unknown"}</div>
        </TableCell>
        <TableCell>{service.bootstrap_status ?? "Not available"}</TableCell>
        <TableCell>
          <div>{service.container_state ?? (service.exists ? "recorded" : "missing")}</div>
          <div className="text-muted-foreground max-w-64 truncate text-xs">{service.container_status ?? service.service_slug ?? "Not available"}</div>
        </TableCell>
        <TableCell>{formatTime(service.last_checked_at ?? service.updated_at)}</TableCell>
      </TableRow>
      <ServiceDetailsRow service={service} />
    </>
  );
}

export function DeploymentsControlPanelSection() {
  const overviewQuery = useDeploymentOverviewQuery();
  const overview = overviewQuery.data;
  const pollingMs = overview?.bootstrap?.status === "running" ? 1000 : 2000;

  if (overviewQuery.isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner size="lg" className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full" data-testid="deployments-control-panel-section">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Deployments</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
              Track core Compose services, managed runtime services, bootstrap progress, and deployment health from one place.
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Last updated {formatTime(overview?.generated_at)} · polling every {pollingMs / 1000}s
            </p>
          </div>
          <Button variant="outline" onClick={() => overviewQuery.refetch()} disabled={overviewQuery.isFetching}>
            <RefreshCw className={cn("size-4", overviewQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {overviewQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Deployment overview unavailable</AlertTitle>
            <AlertDescription>{overviewQuery.error instanceof Error ? overviewQuery.error.message : "Unable to load deployment overview."}</AlertDescription>
          </Alert>
        ) : null}

        {overview ? (
          <>
            <DeploymentSummaryStrip overview={overview} />
            <ServiceGroupPanel title="Core Services" summary={overview.core} group="core" />
            <ServiceGroupPanel title="Runtime Services" summary={overview.runtime} group="runtime" />
          </>
        ) : null}
      </div>
    </div>
  );
}
